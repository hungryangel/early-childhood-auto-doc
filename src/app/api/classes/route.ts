import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classes } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Fetch single class by ID
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const classRecord = await db.select({
        id: classes.id,
        age: classes.age,
        className: classes.className
      })
      .from(classes)
      .where(eq(classes.id, parseInt(id)))
      .limit(1);

      if (classRecord.length === 0) {
        return NextResponse.json({ error: 'Class not found' }, { status: 404 });
      }

      return NextResponse.json(classRecord[0]);
    } else {
      // Fetch all classes
      const allClasses = await db.select({
        id: classes.id,
        age: classes.age,
        className: classes.className
      })
      .from(classes);

      return NextResponse.json(allClasses);
    }
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
    const { age, className } = requestBody;

    // Validate required fields
    if (!age) {
      return NextResponse.json({ 
        error: "Age is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!className) {
      return NextResponse.json({ 
        error: "Class name is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    // Validate field types
    if (typeof age !== 'string') {
      return NextResponse.json({ 
        error: "Age must be a string",
        code: "INVALID_FIELD_TYPE" 
      }, { status: 400 });
    }

    if (typeof className !== 'string') {
      return NextResponse.json({ 
        error: "Class name must be a string",
        code: "INVALID_FIELD_TYPE" 
      }, { status: 400 });
    }

    // Sanitize inputs
    const sanitizedAge = age.trim();
    const sanitizedClassName = className.trim();

    // Validate sanitized inputs are not empty
    if (!sanitizedAge) {
      return NextResponse.json({ 
        error: "Age cannot be empty",
        code: "EMPTY_FIELD" 
      }, { status: 400 });
    }

    if (!sanitizedClassName) {
      return NextResponse.json({ 
        error: "Class name cannot be empty",
        code: "EMPTY_FIELD" 
      }, { status: 400 });
    }

    // Insert new class
    const newClass = await db.insert(classes)
      .values({
        age: sanitizedAge,
        className: sanitizedClassName
      })
      .returning();

    return NextResponse.json(newClass[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const requestBody = await request.json();
    const { age, className } = requestBody;

    // Check if record exists
    const existingClass = await db.select()
      .from(classes)
      .where(eq(classes.id, parseInt(id)))
      .limit(1);

    if (existingClass.length === 0) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Prepare update object with only provided fields
    const updates: any = {};

    if (age !== undefined) {
      if (typeof age !== 'string') {
        return NextResponse.json({ 
          error: "Age must be a string",
          code: "INVALID_FIELD_TYPE" 
        }, { status: 400 });
      }
      const sanitizedAge = age.trim();
      if (!sanitizedAge) {
        return NextResponse.json({ 
          error: "Age cannot be empty",
          code: "EMPTY_FIELD" 
        }, { status: 400 });
      }
      updates.age = sanitizedAge;
    }

    if (className !== undefined) {
      if (typeof className !== 'string') {
        return NextResponse.json({ 
          error: "Class name must be a string",
          code: "INVALID_FIELD_TYPE" 
        }, { status: 400 });
      }
      const sanitizedClassName = className.trim();
      if (!sanitizedClassName) {
        return NextResponse.json({ 
          error: "Class name cannot be empty",
          code: "EMPTY_FIELD" 
        }, { status: 400 });
      }
      updates.className = sanitizedClassName;
    }

    // Update the class
    const updatedClass = await db.update(classes)
      .set(updates)
      .where(eq(classes.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedClass[0]);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists
    const existingClass = await db.select()
      .from(classes)
      .where(eq(classes.id, parseInt(id)))
      .limit(1);

    if (existingClass.length === 0) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Delete the class
    const deletedClass = await db.delete(classes)
      .where(eq(classes.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Class deleted successfully',
      deletedClass: deletedClass[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}