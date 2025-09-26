import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { addDays, startOfWeek, differenceInWeeks } from 'date-fns';
import { db } from '@/db';
import { activityPlans, classes } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { theme, startDate, endDate, ageGroup } = await request.json();

    // Fetch class ID (assume first class)
    const classesResult = await db.select({ id: classes.id }).from(classes).limit(1);
    if (classesResult.length === 0) {
      return NextResponse.json({ success: false, error: '클래스 정보가 없습니다. 우리반 관리를 먼저 설정하세요.' }, { status: 400 });
    }
    const classId = classesResult[0].id;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Compute weeks
    const start = new Date(startDate);
    const end = new Date(endDate);
    const weeks = [];
    let current = startOfWeek(start, { weekStartsOn: 1 }); // Monday start
    const totalWeeks = differenceInWeeks(end, start) + 1;

    for (let i = 0; i < totalWeeks; i++) {
      weeks.push({
        week: i + 1,
        start: current.toISOString().split('T')[0],
        end: addDays(current, 6).toISOString().split('T')[0],
      });
      current = addDays(current, 7);
    }

    // Areas based on age group
    const areas = ageGroup === '0-2' 
      ? ['신체운동·건강', '의사소통', '사회관계', '예술경험', '자연탐구']
      : ['신체운동·건강', '의사소통', '사회관계', '예술경험', '자연탐구'];

    // Prompt
    let prompt = `당신은 박사급 이상의 아동보육과정 전문가입니다. 보육교사가 쉽게 이해할 수 있도록 문서를 작성합니다.

월간 주제: ${theme}
기간: ${startDate} ~ ${endDate} (${totalWeeks}주)
연령: ${ageGroup}세 (${ageGroup === '0-2' ? '표준보육과정' : '누리과정'} 기반)

주차별로 주제에 맞는 소주제를 생성하고, 각 주차의 ${areas.join(', ')} 영역별로 아동이 이해하기 쉬운 활동명을 작성하세요. 활동내용은 활동영역을 반영하여 아동의 연령에 맞는 수준의 활동을 제시하세요. 준비자료는 활동에 따라 필요한 재료를 입력하세요.

출력 형식: JSON 배열, 각 주차 객체에 {week: 1, subtheme: '소주제', activities: [{area: '영역', activityName: '활동명', content: '내용', materials: '준비자료'} ... ]}

주차: ${JSON.stringify(weeks.map(w => w.week))}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON
    let generatedPlan;
    try {
      generatedPlan = JSON.parse(text);
    } catch (e) {
      // Fallback parse if not pure JSON
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      generatedPlan = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    }

    // Save to DB with correct schema fields
    await db.insert(activityPlans).values({
      classId,
      theme,
      startDate,
      endDate,
      age: ageGroup,
      plans: JSON.stringify(generatedPlan),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, plan: generatedPlan });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '알 수 없는 오류 발생' 
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';