import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyChildObservations, classes, children } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Log the full URL for debugging
    console.log('Full URL:', request.url);
    
    const url = new URL(request.url);
    console.log('Parsed URL:', url.toString());
    console.log('Search params string:', url.searchParams.toString());
    
    const date = url.searchParams.get('date');
    const classIdParam = url.searchParams.get('classId');
    
    console.log('Extracted params:', { date, classIdParam });

    // Validate required parameters
    if (!date) {
      return NextResponse.json({ 
        error: 'Date parameter is required',
        code: 'MISSING_DATE' 
      }, { status: 400 });
    }

    if (!classIdParam) {
      return NextResponse.json({ 
        error: 'Class ID parameter is required',
        code: 'MISSING_CLASS_ID' 
      }, { status: 400 });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({ 
        error: 'Date must be in YYYY-MM-DD format',
        code: 'INVALID_DATE_FORMAT' 
      }, { status: 400 });
    }

    // Validate date is a real date
    const dateObj = new Date(date + 'T00:00:00.000Z');
    if (isNaN(dateObj.getTime()) || dateObj.toISOString().split('T')[0] !== date) {
      return NextResponse.json({ 
        error: 'Invalid date provided',
        code: 'INVALID_DATE' 
      }, { status: 400 });
    }

    // Validate classId is valid integer
    const classId = parseInt(classIdParam);
    if (isNaN(classId)) {
      return NextResponse.json({ 
        error: 'Class ID must be a valid integer',
        code: 'INVALID_CLASS_ID' 
      }, { status: 400 });
    }

    console.log('Querying observations with:', { date, classId });

    // Query observations by date and classId
    const observations = await db.select()
      .from(dailyChildObservations)
      .where(and(
        eq(dailyChildObservations.date, date),
        eq(dailyChildObservations.classId, classId)
      ));

    console.log('Found observations:', observations.length);

    return NextResponse.json(observations);

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
    const { classId, date, childId, observation } = requestBody;

    // Validate all required fields are present
    if (!classId) {
      return NextResponse.json({ 
        error: 'Class ID is required',
        code: 'MISSING_CLASS_ID' 
      }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ 
        error: 'Date is required',
        code: 'MISSING_DATE' 
      }, { status: 400 });
    }

    if (!childId) {
      return NextResponse.json({ 
        error: 'Child ID is required',
        code: 'MISSING_CHILD_ID' 
      }, { status: 400 });
    }

    if (!observation) {
      return NextResponse.json({ 
        error: 'Observation is required',
        code: 'MISSING_OBSERVATION' 
      }, { status: 400 });
    }

    // Validate field types
    if (!Number.isInteger(classId)) {
      return NextResponse.json({ 
        error: 'Class ID must be a valid integer',
        code: 'INVALID_CLASS_ID_TYPE' 
      }, { status: 400 });
    }

    if (typeof date !== 'string') {
      return NextResponse.json({ 
        error: 'Date must be a string',
        code: 'INVALID_DATE_TYPE' 
      }, { status: 400 });
    }

    if (!Number.isInteger(childId)) {
      return NextResponse.json({ 
        error: 'Child ID must be a valid integer',
        code: 'INVALID_CHILD_ID_TYPE' 
      }, { status: 400 });
    }

    if (typeof observation !== 'string' || observation.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Observation must be a non-empty string',
        code: 'INVALID_OBSERVATION' 
      }, { status: 400 });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({ 
        error: 'Date must be in YYYY-MM-DD format',
        code: 'INVALID_DATE_FORMAT' 
      }, { status: 400 });
    }

    // Validate date is a real date
    const dateObj = new Date(date + 'T00:00:00.000Z');
    if (isNaN(dateObj.getTime()) || dateObj.toISOString().split('T')[0] !== date) {
      return NextResponse.json({ 
        error: 'Invalid date provided',
        code: 'INVALID_DATE' 
      }, { status: 400 });
    }

    // Verify classId exists in classes table
    const classExists = await db.select()
      .from(classes)
      .where(eq(classes.id, classId))
      .limit(1);

    if (classExists.length === 0) {
      return NextResponse.json({ 
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND' 
      }, { status: 400 });
    }

    // Verify childId exists in children table
    const childExists = await db.select()
      .from(children)
      .where(eq(children.id, childId))
      .limit(1);

    if (childExists.length === 0) {
      return NextResponse.json({ 
        error: 'Child not found',
        code: 'CHILD_NOT_FOUND' 
      }, { status: 400 });
    }

    // Insert new observation
    const newObservation = await db.insert(dailyChildObservations)
      .values({
        classId,
        date,
        childId,
        observation: observation.trim(),
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json({ 
      success: true, 
      id: newObservation[0].id 
    }, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}