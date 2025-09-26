import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/db';
import { childcareLogs, activityPlans, classes } from '@/db/schema';
import { eq, and, lte, gte } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { keywords, date, ageGroup } = await request.json();

    // Input validation
    if (!keywords || typeof keywords !== 'string' || keywords.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Keywords are required and must be a non-empty string'
      }, { status: 400 });
    }

    if (!date || typeof date !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Date is required and must be a string in YYYY-MM-DD format'
      }, { status: 400 });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({
        success: false,
        error: 'Date must be in YYYY-MM-DD format'
      }, { status: 400 });
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date provided'
      }, { status: 400 });
    }

    if (!ageGroup || (ageGroup !== '0-2' && ageGroup !== '3-5')) {
      return NextResponse.json({
        success: false,
        error: 'Age group must be either "0-2" or "3-5"'
      }, { status: 400 });
    }

    // Check if GEMINI_API_KEY exists
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'AI service configuration error'
      }, { status: 500 });
    }

    // Calculate previous day and next day dates
    const currentDate = new Date(date);
    const previousDate = new Date(currentDate);
    previousDate.setDate(currentDate.getDate() - 1);
    const tomorrowDate = new Date(currentDate);
    tomorrowDate.setDate(currentDate.getDate() + 1);

    const previousDateStr = previousDate.toISOString().split('T')[0];
    const tomorrowDateStr = tomorrowDate.toISOString().split('T')[0];

    // Get first available classId from classes table
    const classResult = await db.select().from(classes).limit(1);
    if (classResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No class found in the system'
      }, { status: 400 });
    }

    const classId = classResult[0].id;

    // Fetch previous day's evaluation (supportPlan field)
    let previousEvaluation = '';
    try {
      const previousLogResult = await db.select()
        .from(childcareLogs)
        .where(and(
          eq(childcareLogs.date, previousDateStr),
          eq(childcareLogs.classId, classId)
        ))
        .limit(1);

      if (previousLogResult.length > 0) {
        previousEvaluation = previousLogResult[0].supportPlan || '';
      }
    } catch (error) {
      console.error('Error fetching previous evaluation:', error);
    }

    // Fetch tomorrow's activity plan
    let tomorrowPlan = '';
    try {
      const activityPlanResult = await db.select()
        .from(activityPlans)
        .where(and(
          eq(activityPlans.classId, classId),
          lte(activityPlans.startDate, tomorrowDateStr),
          gte(activityPlans.endDate, tomorrowDateStr)
        ))
        .limit(1);

      if (activityPlanResult.length > 0) {
        const plans = activityPlanResult[0].plans;
        if (Array.isArray(plans) && plans.length > 0) {
          tomorrowPlan = plans.map(plan => 
            typeof plan === 'object' ? JSON.stringify(plan) : String(plan)
          ).join(', ');
        }
      }

      // If no activity plan found, check childcare_logs for tomorrow's date
      if (!tomorrowPlan) {
        const tomorrowLogResult = await db.select()
          .from(childcareLogs)
          .where(and(
            eq(childcareLogs.date, tomorrowDateStr),
            eq(childcareLogs.classId, classId)
          ))
          .limit(1);

        if (tomorrowLogResult.length > 0) {
          tomorrowPlan = tomorrowLogResult[0].supportPlan || '';
        }
      }
    } catch (error) {
      console.error('Error fetching tomorrow plan:', error);
    }

    // Initialize GoogleGenerativeAI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Determine curriculum standard based on age group
    const curriculumStandard = ageGroup === '0-2' ? '표준보육과정' : '누리과정';

    // Construct AI prompt
    const prompt = `당신은 박사급 이상의 아동보육과정 전문가입니다. 보육교사가 쉽게 이해할 수 있도록 문서를 작성합니다.

평가 작성 시 '-했습니다.'라는 어체를 사용하지 않는다. '-한다., -했다.'로 어체를 지정한다.

연령: ${ageGroup}세 (${curriculumStandard} 기준)
키워드: ${keywords}

어제 지원계획: ${previousEvaluation || '이전 계획 정보 없음'}
내일 활동계획: ${tomorrowPlan || '다음날 계획 정보 없음'}

어제 계획이 오늘 어떻게 반영되었는지, 오늘의 놀이활동(키워드 기반)을 평가하고, 내일의 구체적인 지원계획을 포함한 평가 및 지원계획을 작성해주세요. 아동의 발달 상황 관찰 내용은 별도로 작성하세요.

교사의 전문적인 관점에서의 제언은 포함하지 마세요. 날짜와 요일은 언급하지 마세요.

출력을 다음과 같이 포맷하세요:

**평가 및 지원계획:**

[어제 계획 반영, 오늘 놀이 평가, 내일 지원 계획을 번호 구분 없이 하나의 연결된 글로 상세히 작성]

**아동관찰:**

[아동의 발달 상황 관찰 내용을 상세히 작성]

모든 내용은 실무에서 바로 활용할 수 있도록 구체적이고 실용적으로 작성해주세요. 한국어로 작성해주세요.`;

    // Generate evaluation using GoogleAI
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const evaluation = response.text();

      if (!evaluation || evaluation.trim() === '') {
        return NextResponse.json({
          success: false,
          error: 'Failed to generate evaluation content'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        evaluation: evaluation.trim()
      }, { status: 200 });

    } catch (aiError) {
      console.error('GoogleAI API error:', aiError);
      return NextResponse.json({
        success: false,
        error: 'Failed to generate evaluation due to AI service error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('POST /api/generate-evaluation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error: ' + String(error)
    }, { status: 500 });
  }
}