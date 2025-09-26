import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { childName, ageGroup, keywords, date, curriculum } = await request.json();

    // Input validation
    if (!childName || typeof childName !== 'string' || childName.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Child name is required and must be a non-empty string'
      }, { status: 400 });
    }

    if (!keywords || typeof keywords !== 'string' || keywords.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Keywords are required and must be a non-empty string'
      }, { status: 400 });
    }

    if (!ageGroup || (ageGroup !== '0-2' && ageGroup !== '3-5')) {
      return NextResponse.json({
        success: false,
        error: 'Age group must be either "0-2" or "3-5"'
      }, { status: 400 });
    }

    // Date optional, but validate if provided
    if (date && (!typeof date === 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
      return NextResponse.json({
        success: false,
        error: 'Date must be in YYYY-MM-DD format if provided'
      }, { status: 400 });
    }

    if (!curriculum || typeof curriculum !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Curriculum is required and must be a string'
      }, { status: 400 });
    }

    // Check if GEMINI_API_KEY exists
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'AI service configuration error'
      }, { status: 500 });
    }

    // Initialize GoogleGenerativeAI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Construct AI prompt
    const prompt = `당신은 박사급 이상의 아동보육과정 전문가입니다. 교사의 전문성이 드러날 수 있도록 아동의 관찰 내용을 작성합니다.

아동명: ${childName}
연령: ${ageGroup}세 (${curriculum} 기준)
키워드: ${keywords}
${date ? `날짜: ${date}` : ''}

키워드를 기반으로 해당 아동의 발달 상황을 관찰한 상세한 내용을 작성해주세요. 연령에 맞는 발달 영역을 반영하고, 구체적이고 실용적인 관찰을 서술하세요. 한국어로 작성해주세요.`;

    // Generate observation using GoogleAI
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const observation = response.text();

    if (!observation || observation.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate observation content'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      observation: observation.trim()
    }, { status: 200 });

  } catch (error) {
    console.error('POST /api/generate-child-observation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error: ' + String(error)
    }, { status: 500 });
  }
}