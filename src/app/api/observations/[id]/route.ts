import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { observations } from '@/db/schema';
import { eq } from 'drizzle-orm';

const VALID_DOMAINS = ['전반', '신체', '의사소통', '사회', '예술', '자연'];

function validateObservationData(data: any) {
  const errors = [];

  // Required fields validation
  if (!data.childId) errors.push('Child ID is required');
  if (!data.date) errors.push('Date is required');
  if (!data.domain) errors.push('Domain is required');
  if (!data.summary) errors.push('Summary is required');
  if (!data.author) errors.push('Author is required');

  // Domain validation
  if (data.domain && !VALID_DOMAINS.includes(data.domain)) {
    errors.push(`Domain must be one of: ${VALID_DOMAINS.join(', ')}`);
  }

  // Date format validation (YYYY-MM-DD)
  if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.push('Date must be in YYYY-MM-DD format');
  }

  // Time format validation (HH:MM) - optional
  if (data.time && !/^\d{2}:\d{2}$/.test(data.time)) {
    errors.push('Time must be in HH:MM format');
  }

  // JSON array validations
  if (data.tags) {
    try {
      const tags = typeof data.tags === 'string' ? JSON.parse(data.tags) : data.tags;
      if (!Array.isArray(tags)) {
        errors.push('Tags must be an array');
      } else if (!tags.every(tag => typeof tag === 'string')) {
        errors.push('All tags must be strings');
      }
    } catch (error) {
      errors.push('Tags must be valid JSON array');
    }
  }

  if (data.media) {
    try {
      const media = typeof data.media === 'string' ? JSON.parse(data.media) : data.media;
      if (!Array.isArray(media)) {
        errors.push('Media must be an array');
      }
    } catch (error) {
      errors.push('Media must be valid JSON array');
    }
  }

  if (data.followUps) {
    try {
      const followUps = typeof data.followUps === 'string' ? JSON.parse(data.followUps) : data.followUps;
      if (!Array.isArray(followUps)) {
        errors.push('Follow ups must be an array');
      } else if (!followUps.every(item => typeof item === 'string')) {
        errors.push('All follow ups must be strings');
      }
    } catch (error) {
      errors.push('Follow ups must be valid JSON array');
    }
  }

  // Type validations
  if (data.childId && (isNaN(parseInt(data.childId)) || parseInt(data.childId) <= 0)) {
    errors.push('Child ID must be a positive integer');
  }

  if (data.linkedToReport !== undefined && typeof data.linkedToReport !== 'boolean') {
    errors.push('Linked to report must be a boolean');
  }

  return errors;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: "Valid ID is required",
        code: "INVALID_ID"
      }, { status: 400 });
    }

    const requestBody = await request.json();

    // Security check: prevent user ID injection
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED"
      }, { status: 400 });
    }

    // Check if observation exists
    const existingObservation = await db.select()
      .from(observations)
      .where(eq(observations.id, parseInt(id)))
      .limit(1);

    if (existingObservation.length === 0) {
      return NextResponse.json({
        error: 'Observation not found',
        code: 'OBSERVATION_NOT_FOUND'
      }, { status: 404 });
    }

    // Validate the update data
    const validationErrors = validateObservationData(requestBody);
    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      }, { status: 400 });
    }

    // Prepare update data with sanitization
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    // Update only provided fields
    if (requestBody.childId !== undefined) updateData.childId = parseInt(requestBody.childId);
    if (requestBody.date !== undefined) updateData.date = requestBody.date.trim();
    if (requestBody.time !== undefined) updateData.time = requestBody.time ? requestBody.time.trim() : null;
    if (requestBody.domain !== undefined) updateData.domain = requestBody.domain.trim();
    if (requestBody.summary !== undefined) updateData.summary = requestBody.summary.trim();
    if (requestBody.detail !== undefined) updateData.detail = requestBody.detail ? requestBody.detail.trim() : null;
    if (requestBody.author !== undefined) updateData.author = requestBody.author.trim();
    if (requestBody.linkedToReport !== undefined) updateData.linkedToReport = requestBody.linkedToReport;

    // Handle JSON fields
    if (requestBody.tags !== undefined) {
      updateData.tags = typeof requestBody.tags === 'string' ? requestBody.tags : JSON.stringify(requestBody.tags);
    }
    if (requestBody.media !== undefined) {
      updateData.media = typeof requestBody.media === 'string' ? requestBody.media : JSON.stringify(requestBody.media);
    }
    if (requestBody.followUps !== undefined) {
      updateData.followUps = typeof requestBody.followUps === 'string' ? requestBody.followUps : JSON.stringify(requestBody.followUps);
    }

    // Update the observation
    const updatedObservation = await db.update(observations)
      .set(updateData)
      .where(eq(observations.id, parseInt(id)))
      .returning();

    if (updatedObservation.length === 0) {
      return NextResponse.json({
        error: 'Failed to update observation',
        code: 'UPDATE_FAILED'
      }, { status: 500 });
    }

    return NextResponse.json(updatedObservation[0]);

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: "Valid ID is required",
        code: "INVALID_ID"
      }, { status: 400 });
    }

    // Check if observation exists
    const existingObservation = await db.select()
      .from(observations)
      .where(eq(observations.id, parseInt(id)))
      .limit(1);

    if (existingObservation.length === 0) {
      return NextResponse.json({
        error: 'Observation not found',
        code: 'OBSERVATION_NOT_FOUND'
      }, { status: 404 });
    }

    // Delete the observation
    const deletedObservation = await db.delete(observations)
      .where(eq(observations.id, parseInt(id)))
      .returning();

    if (deletedObservation.length === 0) {
      return NextResponse.json({
        error: 'Failed to delete observation',
        code: 'DELETE_FAILED'
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Observation deleted successfully',
      deletedObservation: deletedObservation[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}