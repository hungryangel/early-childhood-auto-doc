import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { childcareLogs, classes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const { date } = params;
    const { searchParams } = new URL(request.url);
    const classIdParam = searchParams.get('classId');

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({
        error: "Invalid date format. Use YYYY-MM-DD",
        code: "INVALID_DATE_FORMAT"
      }, { status: 400 });
    }

    // Validate date is a real date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
      return NextResponse.json({
        error: "Invalid date",
        code: "INVALID_DATE"
      }, { status: 400 });
    }

    let classId: number;

    // Get classId from query param or use first class
    if (classIdParam) {
      classId = parseInt(classIdParam);
      if (isNaN(classId)) {
        return NextResponse.json({
          error: "Invalid classId",
          code: "INVALID_CLASS_ID"
        }, { status: 400 });
      }

      // Validate classId exists
      const classExists = await db.select()
        .from(classes)
        .where(eq(classes.id, classId))
        .limit(1);

      if (classExists.length === 0) {
        return NextResponse.json({
          error: "Class not found",
          code: "CLASS_NOT_FOUND"
        }, { status: 400 });
      }
    } else {
      // Get first available class
      const firstClass = await db.select()
        .from(classes)
        .limit(1);

      if (firstClass.length === 0) {
        return NextResponse.json({
          error: "No classes available",
          code: "NO_CLASSES_FOUND"
        }, { status: 400 });
      }

      classId = firstClass[0].id;
    }

    // Find childcare log record
    const record = await db.select()
      .from(childcareLogs)
      .where(and(
        eq(childcareLogs.date, date),
        eq(childcareLogs.classId, classId)
      ))
      .limit(1);

    if (record.length === 0) {
      return NextResponse.json({
        error: "Childcare log not found",
        code: "LOG_NOT_FOUND"
      }, { status: 404 });
    }

    return NextResponse.json({
      evaluationContent: record[0].evaluationContent || null
    });

  } catch (error) {
    console.error('GET evaluation error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const { date } = params;
    const body = await request.json();
    const { evaluationContent, classId: bodyClassId } = body;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({
        error: "Invalid date format. Use YYYY-MM-DD",
        code: "INVALID_DATE_FORMAT"
      }, { status: 400 });
    }

    // Validate date is a real date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
      return NextResponse.json({
        error: "Invalid date",
        code: "INVALID_DATE"
      }, { status: 400 });
    }

    // Validate evaluationContent
    if (!evaluationContent || typeof evaluationContent !== 'string' || evaluationContent.trim() === '') {
      return NextResponse.json({
        error: "evaluationContent is required and must be a non-empty string",
        code: "MISSING_EVALUATION_CONTENT"
      }, { status: 400 });
    }

    let classId: number;

    // Get classId from body or use first class
    if (bodyClassId) {
      classId = parseInt(bodyClassId);
      if (isNaN(classId)) {
        return NextResponse.json({
          error: "Invalid classId",
          code: "INVALID_CLASS_ID"
        }, { status: 400 });
      }

      // Validate classId exists
      const classExists = await db.select()
        .from(classes)
        .where(eq(classes.id, classId))
        .limit(1);

      if (classExists.length === 0) {
        return NextResponse.json({
          error: "Class not found",
          code: "CLASS_NOT_FOUND"
        }, { status: 400 });
      }
    } else {
      // Get first available class
      const firstClass = await db.select()
        .from(classes)
        .limit(1);

      if (firstClass.length === 0) {
        return NextResponse.json({
          error: "No classes available",
          code: "NO_CLASSES_FOUND"
        }, { status: 400 });
      }

      classId = firstClass[0].id;
    }

    // Check if record exists
    const existingRecord = await db.select()
      .from(childcareLogs)
      .where(and(
        eq(childcareLogs.date, date),
        eq(childcareLogs.classId, classId)
      ))
      .limit(1);

    let result;
    let statusCode;

    if (existingRecord.length > 0) {
      // Update existing record
      result = await db.update(childcareLogs)
        .set({
          evaluationContent: evaluationContent.trim()
        })
        .where(and(
          eq(childcareLogs.date, date),
          eq(childcareLogs.classId, classId)
        ))
        .returning();
      statusCode = 200;
    } else {
      // Create new record with defaults
      result = await db.insert(childcareLogs)
        .values({
          classId,
          date,
          keywords: 'Generated evaluation',
          evaluation: 'Auto-generated evaluation content',
          supportPlan: 'Generated support plan',
          evaluationContent: evaluationContent.trim(),
          createdAt: new Date().toISOString()
        })
        .returning();
      statusCode = 201;
    }

    return NextResponse.json(result[0], { status: statusCode });

  } catch (error) {
    console.error('POST evaluation error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}