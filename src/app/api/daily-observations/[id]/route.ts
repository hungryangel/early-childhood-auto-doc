import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyChildObservations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID is valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const requestBody = await request.json();
    const { observation } = requestBody;

    // Validate observation is present and non-empty string
    if (!observation || typeof observation !== 'string' || observation.trim() === '') {
      return NextResponse.json({ 
        error: "Observation is required and must be a non-empty string",
        code: "INVALID_OBSERVATION" 
      }, { status: 400 });
    }

    // Check if observation record exists by id
    const existingRecord = await db.select()
      .from(dailyChildObservations)
      .where(eq(dailyChildObservations.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Observation record not found',
        code: "RECORD_NOT_FOUND" 
      }, { status: 404 });
    }

    // Update only the observation field for the matching id
    await db.update(dailyChildObservations)
      .set({
        observation: observation.trim()
      })
      .where(eq(dailyChildObservations.id, parseInt(id)));

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: "INTERNAL_ERROR"
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID is valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if observation record exists by id
    const existingRecord = await db.select()
      .from(dailyChildObservations)
      .where(eq(dailyChildObservations.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Observation record not found',
        code: "RECORD_NOT_FOUND" 
      }, { status: 404 });
    }

    // Delete the observation record by id
    await db.delete(dailyChildObservations)
      .where(eq(dailyChildObservations.id, parseInt(id)));

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: "INTERNAL_ERROR"
    }, { status: 500 });
  }
}