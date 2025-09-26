import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { childcareLogs } from '@/db/schema';
import { eq, and, gte, lte, asc, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const classIdParam = searchParams.get('classId');

    console.log('Weekly API - Search params:', { startDate, endDate, classIdParam });

    // Validate required parameters
    if (!startDate) {
      return NextResponse.json({ 
        error: "startDate parameter is required",
        code: "MISSING_START_DATE" 
      }, { status: 400 });
    }

    if (!endDate) {
      return NextResponse.json({ 
        error: "endDate parameter is required",
        code: "MISSING_END_DATE" 
      }, { status: 400 });
    }

    // Validate date format with regex
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate)) {
      return NextResponse.json({ 
        error: "startDate must be in YYYY-MM-DD format",
        code: "INVALID_START_DATE_FORMAT" 
      }, { status: 400 });
    }

    if (!dateRegex.test(endDate)) {
      return NextResponse.json({ 
        error: "endDate must be in YYYY-MM-DD format",
        code: "INVALID_END_DATE_FORMAT" 
      }, { status: 400 });
    }

    // Validate dates with Date constructor
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isNaN(startDateObj.getTime())) {
      return NextResponse.json({ 
        error: "startDate is not a valid date",
        code: "INVALID_START_DATE" 
      }, { status: 400 });
    }

    if (isNaN(endDateObj.getTime())) {
      return NextResponse.json({ 
        error: "endDate is not a valid date",
        code: "INVALID_END_DATE" 
      }, { status: 400 });
    }

    // Ensure startDate <= endDate
    if (startDateObj > endDateObj) {
      return NextResponse.json({ 
        error: "startDate must be less than or equal to endDate",
        code: "INVALID_DATE_RANGE" 
      }, { status: 400 });
    }

    // Validate classId if provided
    let classId: number | null = null;
    if (classIdParam) {
      classId = parseInt(classIdParam);
      if (isNaN(classId)) {
        return NextResponse.json({ 
          error: "classId must be a valid integer",
          code: "INVALID_CLASS_ID" 
        }, { status: 400 });
      }
    }

    // Build query with date range filter - schedule field will be included automatically
    let query = db.select()
      .from(childcareLogs)
      .where(and(
        gte(childcareLogs.date, startDate),
        lte(childcareLogs.date, endDate)
      ));

    // Add classId filter if provided
    if (classId !== null) {
      query = db.select()
        .from(childcareLogs)
        .where(and(
          gte(childcareLogs.date, startDate),
          lte(childcareLogs.date, endDate),
          eq(childcareLogs.classId, classId)
        ));
    }

    // Execute query with ordering
    const results = await query.orderBy(asc(childcareLogs.date), desc(childcareLogs.createdAt));

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET weekly childcare logs error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}