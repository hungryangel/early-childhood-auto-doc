import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { observationLogs } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');
    const startMonth = searchParams.get('startMonth');
    const endMonth = searchParams.get('endMonth');

    // childId is required for filtering
    if (!childId || isNaN(parseInt(childId))) {
      return NextResponse.json({ 
        error: "Valid childId is required",
        code: "INVALID_CHILD_ID" 
      }, { status: 400 });
    }

    let query = db.select().from(observationLogs).where(eq(observationLogs.childId, parseInt(childId)));

    // Apply month range filtering if provided
    if (startMonth && endMonth) {
      query = query.where(and(
        eq(observationLogs.childId, parseInt(childId)),
        gte(observationLogs.month, startMonth),
        lte(observationLogs.month, endMonth)
      ));
    } else if (startMonth) {
      query = query.where(and(
        eq(observationLogs.childId, parseInt(childId)),
        gte(observationLogs.month, startMonth)
      ));
    } else if (endMonth) {
      query = query.where(and(
        eq(observationLogs.childId, parseInt(childId)),
        lte(observationLogs.month, endMonth)
      ));
    }

    const results = await query;
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
    const { childId, month, keywords, content } = requestBody;

    // Validate required fields
    if (!childId || isNaN(parseInt(childId))) {
      return NextResponse.json({ 
        error: "Valid childId is required",
        code: "MISSING_CHILD_ID" 
      }, { status: 400 });
    }

    if (!month || typeof month !== 'string') {
      return NextResponse.json({ 
        error: "Month is required and must be a valid ISO date string",
        code: "MISSING_MONTH" 
      }, { status: 400 });
    }

    if (!keywords || typeof keywords !== 'string' || keywords.trim() === '') {
      return NextResponse.json({ 
        error: "Keywords are required",
        code: "MISSING_KEYWORDS" 
      }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ 
        error: "Content is required",
        code: "MISSING_CONTENT" 
      }, { status: 400 });
    }

    // Validate month is a valid ISO date string
    try {
      new Date(month);
    } catch {
      return NextResponse.json({ 
        error: "Month must be a valid ISO date string",
        code: "INVALID_MONTH_FORMAT" 
      }, { status: 400 });
    }

    const insertData = {
      childId: parseInt(childId),
      month: month.trim(),
      keywords: keywords.trim(),
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    const newRecord = await db.insert(observationLogs)
      .values(insertData)
      .returning();

    return NextResponse.json(newRecord[0], { status: 201 });

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

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const requestBody = await request.json();
    const { month, keywords, content } = requestBody;

    // Check if record exists
    const existingRecord = await db.select()
      .from(observationLogs)
      .where(eq(observationLogs.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Observation log not found' 
      }, { status: 404 });
    }

    // Build update object with only provided fields
    const updates: any = {
      createdAt: new Date().toISOString()
    };

    if (month !== undefined) {
      if (typeof month !== 'string' || month.trim() === '') {
        return NextResponse.json({ 
          error: "Month must be a valid ISO date string",
          code: "INVALID_MONTH" 
        }, { status: 400 });
      }
      // Validate month is a valid ISO date string
      try {
        new Date(month);
        updates.month = month.trim();
      } catch {
        return NextResponse.json({ 
          error: "Month must be a valid ISO date string",
          code: "INVALID_MONTH_FORMAT" 
        }, { status: 400 });
      }
    }

    if (keywords !== undefined) {
      if (typeof keywords !== 'string' || keywords.trim() === '') {
        return NextResponse.json({ 
          error: "Keywords cannot be empty",
          code: "INVALID_KEYWORDS" 
        }, { status: 400 });
      }
      updates.keywords = keywords.trim();
    }

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim() === '') {
        return NextResponse.json({ 
          error: "Content cannot be empty",
          code: "INVALID_CONTENT" 
        }, { status: 400 });
      }
      updates.content = content.trim();
    }

    const updated = await db.update(observationLogs)
      .set(updates)
      .where(eq(observationLogs.id, parseInt(id)))
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

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists
    const existingRecord = await db.select()
      .from(observationLogs)
      .where(eq(observationLogs.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Observation log not found' 
      }, { status: 404 });
    }

    const deleted = await db.delete(observationLogs)
      .where(eq(observationLogs.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Observation log deleted successfully',
      deleted: deleted[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}