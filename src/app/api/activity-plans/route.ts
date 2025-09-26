import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { activityPlans, classes } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';

interface ActivityPlan {
  week: string;
  area: string;
  name: string;
  content: string;
  materials: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    let query = db.select().from(activityPlans);

    // Filter by classId if provided
    if (classId) {
      const classIdNum = parseInt(classId);
      if (!classIdNum || isNaN(classIdNum)) {
        return NextResponse.json({ 
          error: "Valid class ID is required",
          code: "INVALID_CLASS_ID" 
        }, { status: 400 });
      }
      query = query.where(eq(activityPlans.classId, classIdNum));
    }

    // Apply sorting
    const orderBy = order === 'desc' ? desc : asc;
    const sortColumn = sort === 'theme' ? activityPlans.theme :
                      sort === 'startDate' ? activityPlans.startDate :
                      sort === 'endDate' ? activityPlans.endDate :
                      sort === 'age' ? activityPlans.age :
                      activityPlans.createdAt;

    const results = await query
      .orderBy(orderBy(sortColumn))
      .limit(limit)
      .offset(offset);

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
    const { classId, theme, startDate, endDate, age, plans } = requestBody;

    // Validate required fields
    if (!classId) {
      return NextResponse.json({ 
        error: "Class ID is required",
        code: "MISSING_CLASS_ID" 
      }, { status: 400 });
    }

    if (!theme || typeof theme !== 'string' || theme.trim() === '') {
      return NextResponse.json({ 
        error: "Theme is required and must be a non-empty string",
        code: "INVALID_THEME" 
      }, { status: 400 });
    }

    if (!startDate || typeof startDate !== 'string') {
      return NextResponse.json({ 
        error: "Start date is required and must be an ISO date string",
        code: "INVALID_START_DATE" 
      }, { status: 400 });
    }

    if (!endDate || typeof endDate !== 'string') {
      return NextResponse.json({ 
        error: "End date is required and must be an ISO date string",
        code: "INVALID_END_DATE" 
      }, { status: 400 });
    }

    if (!age || typeof age !== 'string' || age.trim() === '') {
      return NextResponse.json({ 
        error: "Age is required and must be a non-empty string",
        code: "INVALID_AGE" 
      }, { status: 400 });
    }

    if (!plans || !Array.isArray(plans) || plans.length === 0) {
      return NextResponse.json({ 
        error: "Plans is required and must be a non-empty array",
        code: "INVALID_PLANS" 
      }, { status: 400 });
    }

    // Validate classId is integer
    const classIdNum = parseInt(classId);
    if (isNaN(classIdNum)) {
      return NextResponse.json({ 
        error: "Class ID must be a valid integer",
        code: "INVALID_CLASS_ID_TYPE" 
      }, { status: 400 });
    }

    // Validate dates are valid ISO strings
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || startDate !== startDateObj.toISOString().split('T')[0]) {
      return NextResponse.json({ 
        error: "Start date must be a valid ISO date string (YYYY-MM-DD)",
        code: "INVALID_START_DATE_FORMAT" 
      }, { status: 400 });
    }

    if (isNaN(endDateObj.getTime()) || endDate !== endDateObj.toISOString().split('T')[0]) {
      return NextResponse.json({ 
        error: "End date must be a valid ISO date string (YYYY-MM-DD)",
        code: "INVALID_END_DATE_FORMAT" 
      }, { status: 400 });
    }

    // Validate classId exists
    const existingClass = await db.select()
      .from(classes)
      .where(eq(classes.id, classIdNum))
      .limit(1);

    if (existingClass.length === 0) {
      return NextResponse.json({ 
        error: "Class not found",
        code: "CLASS_NOT_FOUND" 
      }, { status: 400 });
    }

    // Validate plans structure
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      if (!plan || typeof plan !== 'object') {
        return NextResponse.json({ 
          error: `Plan at index ${i} must be an object`,
          code: "INVALID_PLAN_STRUCTURE" 
        }, { status: 400 });
      }

      const requiredFields = ['week', 'area', 'name', 'content', 'materials'];
      for (const field of requiredFields) {
        if (!plan[field] || typeof plan[field] !== 'string') {
          return NextResponse.json({ 
            error: `Plan at index ${i} is missing required field '${field}' or it's not a string`,
            code: "INVALID_PLAN_FIELD" 
          }, { status: 400 });
        }
      }
    }

    // Sanitize inputs
    const sanitizedTheme = theme.trim();
    const sanitizedAge = age.trim();
    const sanitizedPlans = plans.map((plan: ActivityPlan) => ({
      week: plan.week.trim(),
      area: plan.area.trim(),
      name: plan.name.trim(),
      content: plan.content.trim(),
      materials: plan.materials.trim()
    }));

    // Create activity plan
    const newActivityPlan = await db.insert(activityPlans)
      .values({
        classId: classIdNum,
        theme: sanitizedTheme,
        startDate,
        endDate,
        age: sanitizedAge,
        plans: sanitizedPlans,
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newActivityPlan[0], { status: 201 });
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

    const activityPlanId = parseInt(id);
    const updates = await request.json();

    // Check if record exists
    const existing = await db.select()
      .from(activityPlans)
      .where(eq(activityPlans.id, activityPlanId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Activity plan not found' 
      }, { status: 404 });
    }

    const updateData: any = {
      createdAt: new Date().toISOString()
    };

    // Validate and process updates
    if (updates.classId !== undefined) {
      const classIdNum = parseInt(updates.classId);
      if (isNaN(classIdNum)) {
        return NextResponse.json({ 
          error: "Class ID must be a valid integer",
          code: "INVALID_CLASS_ID_TYPE" 
        }, { status: 400 });
      }

      // Validate classId exists
      const existingClass = await db.select()
        .from(classes)
        .where(eq(classes.id, classIdNum))
        .limit(1);

      if (existingClass.length === 0) {
        return NextResponse.json({ 
          error: "Class not found",
          code: "CLASS_NOT_FOUND" 
        }, { status: 400 });
      }

      updateData.classId = classIdNum;
    }

    if (updates.theme !== undefined) {
      if (typeof updates.theme !== 'string' || updates.theme.trim() === '') {
        return NextResponse.json({ 
          error: "Theme must be a non-empty string",
          code: "INVALID_THEME" 
        }, { status: 400 });
      }
      updateData.theme = updates.theme.trim();
    }

    if (updates.startDate !== undefined) {
      if (typeof updates.startDate !== 'string') {
        return NextResponse.json({ 
          error: "Start date must be an ISO date string",
          code: "INVALID_START_DATE" 
        }, { status: 400 });
      }

      const startDateObj = new Date(updates.startDate);
      if (isNaN(startDateObj.getTime()) || updates.startDate !== startDateObj.toISOString().split('T')[0]) {
        return NextResponse.json({ 
          error: "Start date must be a valid ISO date string (YYYY-MM-DD)",
          code: "INVALID_START_DATE_FORMAT" 
        }, { status: 400 });
      }
      updateData.startDate = updates.startDate;
    }

    if (updates.endDate !== undefined) {
      if (typeof updates.endDate !== 'string') {
        return NextResponse.json({ 
          error: "End date must be an ISO date string",
          code: "INVALID_END_DATE" 
        }, { status: 400 });
      }

      const endDateObj = new Date(updates.endDate);
      if (isNaN(endDateObj.getTime()) || updates.endDate !== endDateObj.toISOString().split('T')[0]) {
        return NextResponse.json({ 
          error: "End date must be a valid ISO date string (YYYY-MM-DD)",
          code: "INVALID_END_DATE_FORMAT" 
        }, { status: 400 });
      }
      updateData.endDate = updates.endDate;
    }

    if (updates.age !== undefined) {
      if (typeof updates.age !== 'string' || updates.age.trim() === '') {
        return NextResponse.json({ 
          error: "Age must be a non-empty string",
          code: "INVALID_AGE" 
        }, { status: 400 });
      }
      updateData.age = updates.age.trim();
    }

    if (updates.plans !== undefined) {
      if (!Array.isArray(updates.plans) || updates.plans.length === 0) {
        return NextResponse.json({ 
          error: "Plans must be a non-empty array",
          code: "INVALID_PLANS" 
        }, { status: 400 });
      }

      // Validate plans structure
      for (let i = 0; i < updates.plans.length; i++) {
        const plan = updates.plans[i];
        if (!plan || typeof plan !== 'object') {
          return NextResponse.json({ 
            error: `Plan at index ${i} must be an object`,
            code: "INVALID_PLAN_STRUCTURE" 
          }, { status: 400 });
        }

        const requiredFields = ['week', 'area', 'name', 'content', 'materials'];
        for (const field of requiredFields) {
          if (!plan[field] || typeof plan[field] !== 'string') {
            return NextResponse.json({ 
              error: `Plan at index ${i} is missing required field '${field}' or it's not a string`,
              code: "INVALID_PLAN_FIELD" 
            }, { status: 400 });
          }
        }
      }

      const sanitizedPlans = updates.plans.map((plan: ActivityPlan) => ({
        week: plan.week.trim(),
        area: plan.area.trim(),
        name: plan.name.trim(),
        content: plan.content.trim(),
        materials: plan.materials.trim()
      }));

      updateData.plans = sanitizedPlans;
    }

    // Update the record
    const updated = await db.update(activityPlans)
      .set(updateData)
      .where(eq(activityPlans.id, activityPlanId))
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

    const activityPlanId = parseInt(id);

    // Check if record exists
    const existing = await db.select()
      .from(activityPlans)
      .where(eq(activityPlans.id, activityPlanId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Activity plan not found' 
      }, { status: 404 });
    }

    // Delete the record
    const deleted = await db.delete(activityPlans)
      .where(eq(activityPlans.id, activityPlanId))
      .returning();

    return NextResponse.json({
      message: 'Activity plan deleted successfully',
      deletedRecord: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}