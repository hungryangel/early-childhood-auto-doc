import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { developmentEvaluations, observationLogs, children } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');
    const period = searchParams.get('period');

    // Validate required childId parameter
    if (!childId || isNaN(parseInt(childId))) {
      return NextResponse.json({ 
        error: "Valid childId is required",
        code: "INVALID_CHILD_ID" 
      }, { status: 400 });
    }

    let query = db.select().from(developmentEvaluations);

    // Build where conditions
    const conditions = [eq(developmentEvaluations.childId, parseInt(childId))];
    if (period) {
      conditions.push(eq(developmentEvaluations.period, period));
    }

    const results = await query
      .where(and(...conditions))
      .orderBy(desc(developmentEvaluations.createdAt));

    return NextResponse.json(results);

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
    const { childId, period, overallCharacteristics, parentMessage } = requestBody;

    // Validate required fields
    if (!childId || isNaN(parseInt(childId))) {
      return NextResponse.json({ 
        error: "Valid childId is required",
        code: "MISSING_CHILD_ID" 
      }, { status: 400 });
    }

    if (!period || typeof period !== 'string') {
      return NextResponse.json({ 
        error: "Period is required",
        code: "MISSING_PERIOD" 
      }, { status: 400 });
    }

    if (!overallCharacteristics || typeof overallCharacteristics !== 'string') {
      return NextResponse.json({ 
        error: "Overall characteristics is required",
        code: "MISSING_OVERALL_CHARACTERISTICS" 
      }, { status: 400 });
    }

    if (!parentMessage || typeof parentMessage !== 'string') {
      return NextResponse.json({ 
        error: "Parent message is required",
        code: "MISSING_PARENT_MESSAGE" 
      }, { status: 400 });
    }

    // Get child's birthdate for age calculation
    const child = await db.select()
      .from(children)
      .where(eq(children.id, parseInt(childId)))
      .limit(1);

    if (child.length === 0) {
      return NextResponse.json({ 
        error: "Child not found",
        code: "CHILD_NOT_FOUND" 
      }, { status: 404 });
    }

    // Calculate age at evaluation in months
    const birthDate = new Date(child[0].birthdate);
    const currentDate = new Date();
    const monthsDiff = (currentDate.getFullYear() - birthDate.getFullYear()) * 12 + 
                      (currentDate.getMonth() - birthDate.getMonth());
    const ageAtEvaluation = `${monthsDiff}개월`;

    // Aggregate observations from observation logs
    const logs = await db.select()
      .from(observationLogs)
      .where(eq(observationLogs.childId, parseInt(childId)));

    const observations = logs.map(log => `키워드: ${log.keywords}\n내용: ${log.content}`).join('\n\n');

    // Create new development evaluation
    const newEvaluation = await db.insert(developmentEvaluations)
      .values({
        childId: parseInt(childId),
        period: period.trim(),
        overallCharacteristics: overallCharacteristics.trim(),
        parentMessage: parentMessage.trim(),
        observations: observations || '',
        ageAtEvaluation,
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newEvaluation[0], { status: 201 });

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
    const { period, overallCharacteristics, parentMessage, observations, ageAtEvaluation } = requestBody;

    // Check if record exists
    const existingRecord = await db.select()
      .from(developmentEvaluations)
      .where(eq(developmentEvaluations.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Development evaluation not found' 
      }, { status: 404 });
    }

    // Build update object with only provided fields
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (period !== undefined) {
      if (typeof period !== 'string') {
        return NextResponse.json({ 
          error: "Period must be a string",
          code: "INVALID_PERIOD" 
        }, { status: 400 });
      }
      updates.period = period.trim();
    }

    if (overallCharacteristics !== undefined) {
      if (typeof overallCharacteristics !== 'string') {
        return NextResponse.json({ 
          error: "Overall characteristics must be a string",
          code: "INVALID_OVERALL_CHARACTERISTICS" 
        }, { status: 400 });
      }
      updates.overallCharacteristics = overallCharacteristics.trim();
    }

    if (parentMessage !== undefined) {
      if (typeof parentMessage !== 'string') {
        return NextResponse.json({ 
          error: "Parent message must be a string",
          code: "INVALID_PARENT_MESSAGE" 
        }, { status: 400 });
      }
      updates.parentMessage = parentMessage.trim();
    }

    if (observations !== undefined) {
      if (typeof observations !== 'string') {
        return NextResponse.json({ 
          error: "Observations must be a string",
          code: "INVALID_OBSERVATIONS" 
        }, { status: 400 });
      }
      updates.observations = observations.trim();
    }

    if (ageAtEvaluation !== undefined) {
      if (typeof ageAtEvaluation !== 'string') {
        return NextResponse.json({ 
          error: "Age at evaluation must be a string",
          code: "INVALID_AGE_AT_EVALUATION" 
        }, { status: 400 });
      }
      updates.ageAtEvaluation = ageAtEvaluation.trim();
    }

    // Update the record
    const updated = await db.update(developmentEvaluations)
      .set(updates)
      .where(eq(developmentEvaluations.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0]);

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

    // Check if record exists before deleting
    const existingRecord = await db.select()
      .from(developmentEvaluations)
      .where(eq(developmentEvaluations.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Development evaluation not found' 
      }, { status: 404 });
    }

    // Delete the record
    const deleted = await db.delete(developmentEvaluations)
      .where(eq(developmentEvaluations.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Development evaluation deleted successfully',
      deleted: deleted[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}