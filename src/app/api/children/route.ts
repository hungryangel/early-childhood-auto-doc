import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { children, classes } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const result = await db
      .select({
        id: children.id,
        name: children.name,
        birthdate: children.birthdate,
        classId: children.classId,
        className: classes.className,
        classAge: classes.age,
      })
      .from(children)
      .innerJoin(classes, eq(children.classId, classes.id))
      .orderBy(asc(children.id));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { name, birthdate, classId } = requestBody;

    // Validate required fields
    if (name === undefined || name === null) {
      return NextResponse.json(
        { error: 'Name is required', code: 'MISSING_NAME' },
        { status: 400 }
      );
    }

    if (typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name must be a string', code: 'INVALID_NAME_TYPE' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    if (trimmedName === '') {
      return NextResponse.json(
        { error: 'Name cannot be empty', code: 'EMPTY_NAME' },
        { status: 400 }
      );
    }

    if (!birthdate || typeof birthdate !== 'string') {
      return NextResponse.json(
        { error: 'Birthdate is required and must be a string', code: 'MISSING_BIRTHDATE' },
        { status: 400 }
      );
    }

    // Validate ISO date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthdate)) {
      return NextResponse.json(
        { error: 'Birthdate must be in ISO date format (YYYY-MM-DD)', code: 'INVALID_BIRTHDATE_FORMAT' },
        { status: 400 }
      );
    }

    // Validate date is actually valid
    const parsedDate = new Date(birthdate);
    if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== birthdate) {
      return NextResponse.json(
        { error: 'Birthdate must be a valid date', code: 'INVALID_BIRTHDATE' },
        { status: 400 }
      );
    }

    if (!classId || isNaN(parseInt(classId))) {
      return NextResponse.json(
        { error: 'Valid class ID is required', code: 'INVALID_CLASS_ID' },
        { status: 400 }
      );
    }

    const parsedClassId = parseInt(classId);

    // Check if class exists
    const existingClass = await db
      .select()
      .from(classes)
      .where(eq(classes.id, parsedClassId))
      .limit(1);

    if (existingClass.length === 0) {
      return NextResponse.json(
        { error: 'Class not found', code: 'CLASS_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Create new child
    const newChild = await db
      .insert(children)
      .values({
        name: trimmedName,
        birthdate,
        classId: parsedClassId,
      })
      .returning();

    return NextResponse.json(newChild[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}