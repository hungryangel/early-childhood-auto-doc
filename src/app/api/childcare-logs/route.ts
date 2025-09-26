import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { childcareLogs, classes } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = db.select().from(childcareLogs);
    const conditions = [];

    if (classId) {
      const classIdInt = parseInt(classId);
      if (isNaN(classIdInt)) {
        return NextResponse.json({ 
          error: "Invalid classId format",
          code: "INVALID_CLASS_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(childcareLogs.classId, classIdInt));
    }

    if (startDate) {
      if (!isValidDateFormat(startDate)) {
        return NextResponse.json({ 
          error: "Invalid startDate format. Use YYYY-MM-DD",
          code: "INVALID_START_DATE" 
        }, { status: 400 });
      }
      conditions.push(gte(childcareLogs.date, startDate));
    }

    if (endDate) {
      if (!isValidDateFormat(endDate)) {
        return NextResponse.json({ 
          error: "Invalid endDate format. Use YYYY-MM-DD",
          code: "INVALID_END_DATE" 
        }, { status: 400 });
      }
      conditions.push(lte(childcareLogs.date, endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(childcareLogs.date), desc(childcareLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { classId, date, keywords, evaluation, supportPlan, schedule } = requestBody;

    // Validate required fields
    if (!classId) {
      return NextResponse.json({ 
        error: "classId is required",
        code: "MISSING_CLASS_ID" 
      }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ 
        error: "date is required",
        code: "MISSING_DATE" 
      }, { status: 400 });
    }

    // Validate classId is integer
    const classIdInt = parseInt(classId);
    if (isNaN(classIdInt)) {
      return NextResponse.json({ 
        error: "classId must be a valid integer",
        code: "INVALID_CLASS_ID" 
      }, { status: 400 });
    }

    // Validate date format
    if (!isValidDateFormat(date)) {
      return NextResponse.json({ 
        error: "date must be in YYYY-MM-DD format",
        code: "INVALID_DATE_FORMAT" 
      }, { status: 400 });
    }

    // Validate schedule if provided
    if (schedule !== undefined && schedule !== null) {
      if (!Array.isArray(schedule)) {
        return NextResponse.json({ 
          error: "schedule must be an array of activities",
          code: "INVALID_SCHEDULE_FORMAT" 
        }, { status: 400 });
      }

      // Validate each activity in schedule
      for (let i = 0; i < schedule.length; i++) {
        const activity = schedule[i];
        if (!activity || typeof activity !== 'object') {
          return NextResponse.json({ 
            error: `Activity at index ${i} must be an object`,
            code: "INVALID_ACTIVITY_FORMAT" 
          }, { status: 400 });
        }

        if (!activity.time || typeof activity.time !== 'string') {
          return NextResponse.json({ 
            error: `Activity at index ${i} must have a valid time field`,
            code: "MISSING_ACTIVITY_TIME" 
          }, { status: 400 });
        }

        if (!activity.activity || typeof activity.activity !== 'string') {
          return NextResponse.json({ 
            error: `Activity at index ${i} must have a valid activity field`,
            code: "MISSING_ACTIVITY_NAME" 
          }, { status: 400 });
        }
      }
    }

    // Validate classId exists in classes table
    const existingClass = await db.select()
      .from(classes)
      .where(eq(classes.id, classIdInt))
      .limit(1);

    if (existingClass.length === 0) {
      return NextResponse.json({ 
        error: "Class not found",
        code: "CLASS_NOT_FOUND" 
      }, { status: 404 });
    }

    // Upsert logic
    const existingLog = await db.select().from(childcareLogs)
      .where(and(eq(childcareLogs.classId, classIdInt), eq(childcareLogs.date, date.trim())))
      .limit(1);

    if (existingLog.length > 0) {
      // Update existing
      const updatedLog = await db.update(childcareLogs)
        .set({
          keywords: keywords ? keywords.trim() : '',
          evaluation: evaluation ? evaluation.trim() : '',
          supportPlan: supportPlan ? supportPlan.trim() : '',
          schedule: schedule || null,
        })
        .where(eq(childcareLogs.id, existingLog[0].id))
        .returning();

      return NextResponse.json(updatedLog[0], { status: 200 });
    } else {
      // Create new
      const newLog = await db.insert(childcareLogs)
        .values({
          classId: classIdInt,
          date: date.trim(),
          keywords: keywords ? keywords.trim() : '',
          evaluation: evaluation ? evaluation.trim() : '',
          supportPlan: supportPlan ? supportPlan.trim() : '',
          schedule: schedule || null,
          createdAt: new Date().toISOString()
        })
        .returning();

      return NextResponse.json(newLog[0], { status: 201 });
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

function isValidDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return false;
  }
  
  const parsedDate = new Date(date);
  return parsedDate instanceof Date && !isNaN(parsedDate.getTime()) && parsedDate.toISOString().startsWith(date);
}