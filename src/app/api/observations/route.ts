import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { observations, children } from '@/db/schema';
import { eq, like, and, or, desc, asc, sql } from 'drizzle-orm';

const VALID_DOMAINS = ['전반', '신체', '의사소통', '사회', '예술', '자연'];

function validateDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && date.toISOString().startsWith(dateString);
}

function validateTime(timeString: string): boolean {
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(timeString);
}

function validateMonth(monthString: string): boolean {
  const regex = /^\d{4}-\d{2}$/;
  if (!regex.test(monthString)) return false;
  const [year, month] = monthString.split('-').map(Number);
  return year >= 1900 && year <= 2100 && month >= 1 && month <= 12;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const childIdParam = searchParams.get('childId');
    const month = searchParams.get('month');
    const domain = searchParams.get('domain') || 'all';
    const tagsParam = searchParams.get('tags');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate required childId
    if (!childIdParam || isNaN(parseInt(childIdParam))) {
      return NextResponse.json({ 
        error: "Valid childId is required",
        code: "INVALID_CHILD_ID" 
      }, { status: 400 });
    }

    const childId = parseInt(childIdParam);

    // Validate month format if provided
    if (month && !validateMonth(month)) {
      return NextResponse.json({ 
        error: "Month must be in YYYY-MM format",
        code: "INVALID_MONTH_FORMAT" 
      }, { status: 400 });
    }

    // Validate domain if provided
    if (domain !== 'all' && !VALID_DOMAINS.includes(domain)) {
      return NextResponse.json({ 
        error: "Invalid domain. Must be one of: " + VALID_DOMAINS.join(', '),
        code: "INVALID_DOMAIN" 
      }, { status: 400 });
    }

    // Verify child exists
    const childExists = await db.select({ id: children.id })
      .from(children)
      .where(eq(children.id, childId))
      .limit(1);

    if (childExists.length === 0) {
      return NextResponse.json({ 
        error: "Child not found",
        code: "CHILD_NOT_FOUND" 
      }, { status: 404 });
    }

    // Build base conditions
    let conditions = [eq(observations.childId, childId)];

    // Add month filter
    if (month) {
      conditions.push(like(observations.date, `${month}-%`));
    }

    // Add domain filter
    if (domain !== 'all') {
      conditions.push(eq(observations.domain, domain));
    }

    // Add tags filter
    if (tagsParam) {
      const tagsList = tagsParam.split(',').map(tag => tag.trim());
      const tagConditions = tagsList.map(tag => 
        like(observations.tags, `%"${tag}"%`)
      );
      conditions.push(or(...tagConditions));
    }

    // Add search filter
    if (search) {
      const searchCondition = or(
        like(observations.summary, `%${search}%`),
        like(observations.detail, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    const whereCondition = and(...conditions);

    // Get total count
    const totalCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(observations)
      .where(whereCondition);
    
    const totalCount = totalCountResult[0].count;

    // Get entries with pagination
    const entries = await db.select()
      .from(observations)
      .where(whereCondition)
      .orderBy(desc(observations.date), desc(observations.time))
      .limit(limit)
      .offset(offset);

    // Get daily counts for all matching entries (without pagination)
    const dailyCountsResult = await db.select({
      date: observations.date,
      count: sql<number>`count(*)`
    })
      .from(observations)
      .where(whereCondition)
      .groupBy(observations.date);

    const dailyCounts: Record<string, number> = {};
    dailyCountsResult.forEach(row => {
      dailyCounts[row.date] = row.count;
    });

    return NextResponse.json({
      dailyCounts,
      totalCount,
      entries
    });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      childId,
      date,
      time,
      domain,
      tags = [],
      summary,
      detail,
      media = [],
      author,
      followUps = [],
      linkedToReport = false
    } = body;

    // Validate required fields
    if (!childId || isNaN(parseInt(childId))) {
      return NextResponse.json({ 
        error: "Valid childId is required",
        code: "MISSING_CHILD_ID" 
      }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ 
        error: "Date is required",
        code: "MISSING_DATE" 
      }, { status: 400 });
    }

    if (!validateDate(date)) {
      return NextResponse.json({ 
        error: "Date must be in YYYY-MM-DD format",
        code: "INVALID_DATE_FORMAT" 
      }, { status: 400 });
    }

    if (time && !validateTime(time)) {
      return NextResponse.json({ 
        error: "Time must be in HH:MM format",
        code: "INVALID_TIME_FORMAT" 
      }, { status: 400 });
    }

    if (!domain) {
      return NextResponse.json({ 
        error: "Domain is required",
        code: "MISSING_DOMAIN" 
      }, { status: 400 });
    }

    if (!VALID_DOMAINS.includes(domain)) {
      return NextResponse.json({ 
        error: "Invalid domain. Must be one of: " + VALID_DOMAINS.join(', '),
        code: "INVALID_DOMAIN" 
      }, { status: 400 });
    }

    if (!summary || summary.trim() === '') {
      return NextResponse.json({ 
        error: "Summary is required",
        code: "MISSING_SUMMARY" 
      }, { status: 400 });
    }

    if (!author || author.trim() === '') {
      return NextResponse.json({ 
        error: "Author is required",
        code: "MISSING_AUTHOR" 
      }, { status: 400 });
    }

    // Validate JSON arrays
    if (!Array.isArray(tags)) {
      return NextResponse.json({ 
        error: "Tags must be an array",
        code: "INVALID_TAGS_FORMAT" 
      }, { status: 400 });
    }

    if (!Array.isArray(media)) {
      return NextResponse.json({ 
        error: "Media must be an array",
        code: "INVALID_MEDIA_FORMAT" 
      }, { status: 400 });
    }

    if (!Array.isArray(followUps)) {
      return NextResponse.json({ 
        error: "FollowUps must be an array",
        code: "INVALID_FOLLOWUPS_FORMAT" 
      }, { status: 400 });
    }

    // Verify child exists
    const childExists = await db.select({ id: children.id })
      .from(children)
      .where(eq(children.id, parseInt(childId)))
      .limit(1);

    if (childExists.length === 0) {
      return NextResponse.json({ 
        error: "Child not found",
        code: "CHILD_NOT_FOUND" 
      }, { status: 404 });
    }

    // Create new observation
    const now = new Date().toISOString();
    const newObservation = await db.insert(observations)
      .values({
        childId: parseInt(childId),
        date: date,
        time: time || null,
        domain: domain,
        tags: JSON.stringify(tags),
        summary: summary.trim(),
        detail: detail?.trim() || null,
        media: JSON.stringify(media),
        author: author.trim(),
        followUps: JSON.stringify(followUps),
        linkedToReport: linkedToReport,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return NextResponse.json(newObservation[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const idParam = searchParams.get('id');

    if (!idParam || isNaN(parseInt(idParam))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const id = parseInt(idParam);
    const body = await request.json();

    // Check if observation exists
    const existingObservation = await db.select()
      .from(observations)
      .where(eq(observations.id, id))
      .limit(1);

    if (existingObservation.length === 0) {
      return NextResponse.json({ 
        error: 'Observation not found' 
      }, { status: 404 });
    }

    // Validate updates if provided
    const updates: any = {};

    if (body.childId !== undefined) {
      if (isNaN(parseInt(body.childId))) {
        return NextResponse.json({ 
          error: "Valid childId is required",
          code: "INVALID_CHILD_ID" 
        }, { status: 400 });
      }

      // Verify child exists
      const childExists = await db.select({ id: children.id })
        .from(children)
        .where(eq(children.id, parseInt(body.childId)))
        .limit(1);

      if (childExists.length === 0) {
        return NextResponse.json({ 
          error: "Child not found",
          code: "CHILD_NOT_FOUND" 
        }, { status: 404 });
      }

      updates.childId = parseInt(body.childId);
    }

    if (body.date !== undefined) {
      if (!validateDate(body.date)) {
        return NextResponse.json({ 
          error: "Date must be in YYYY-MM-DD format",
          code: "INVALID_DATE_FORMAT" 
        }, { status: 400 });
      }
      updates.date = body.date;
    }

    if (body.time !== undefined) {
      if (body.time && !validateTime(body.time)) {
        return NextResponse.json({ 
          error: "Time must be in HH:MM format",
          code: "INVALID_TIME_FORMAT" 
        }, { status: 400 });
      }
      updates.time = body.time || null;
    }

    if (body.domain !== undefined) {
      if (!VALID_DOMAINS.includes(body.domain)) {
        return NextResponse.json({ 
          error: "Invalid domain. Must be one of: " + VALID_DOMAINS.join(', '),
          code: "INVALID_DOMAIN" 
        }, { status: 400 });
      }
      updates.domain = body.domain;
    }

    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags)) {
        return NextResponse.json({ 
          error: "Tags must be an array",
          code: "INVALID_TAGS_FORMAT" 
        }, { status: 400 });
      }
      updates.tags = JSON.stringify(body.tags);
    }

    if (body.summary !== undefined) {
      if (!body.summary || body.summary.trim() === '') {
        return NextResponse.json({ 
          error: "Summary cannot be empty",
          code: "EMPTY_SUMMARY" 
        }, { status: 400 });
      }
      updates.summary = body.summary.trim();
    }

    if (body.detail !== undefined) {
      updates.detail = body.detail?.trim() || null;
    }

    if (body.media !== undefined) {
      if (!Array.isArray(body.media)) {
        return NextResponse.json({ 
          error: "Media must be an array",
          code: "INVALID_MEDIA_FORMAT" 
        }, { status: 400 });
      }
      updates.media = JSON.stringify(body.media);
    }

    if (body.author !== undefined) {
      if (!body.author || body.author.trim() === '') {
        return NextResponse.json({ 
          error: "Author cannot be empty",
          code: "EMPTY_AUTHOR" 
        }, { status: 400 });
      }
      updates.author = body.author.trim();
    }

    if (body.followUps !== undefined) {
      if (!Array.isArray(body.followUps)) {
        return NextResponse.json({ 
          error: "FollowUps must be an array",
          code: "INVALID_FOLLOWUPS_FORMAT" 
        }, { status: 400 });
      }
      updates.followUps = JSON.stringify(body.followUps);
    }

    if (body.linkedToReport !== undefined) {
      updates.linkedToReport = body.linkedToReport;
    }

    // Always update timestamp
    updates.updatedAt = new Date().toISOString();

    const updatedObservation = await db.update(observations)
      .set(updates)
      .where(eq(observations.id, id))
      .returning();

    return NextResponse.json(updatedObservation[0]);

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const idParam = searchParams.get('id');

    if (!idParam || isNaN(parseInt(idParam))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const id = parseInt(idParam);

    // Check if observation exists
    const existingObservation = await db.select()
      .from(observations)
      .where(eq(observations.id, id))
      .limit(1);

    if (existingObservation.length === 0) {
      return NextResponse.json({ 
        error: 'Observation not found' 
      }, { status: 404 });
    }

    const deletedObservation = await db.delete(observations)
      .where(eq(observations.id, id))
      .returning();

    return NextResponse.json({
      message: 'Observation deleted successfully',
      deleted: deletedObservation[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}