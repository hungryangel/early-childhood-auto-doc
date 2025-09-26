import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { childcareLogs } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const { date } = params;
    const { searchParams } = new URL(request.url);
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({ 
        error: "Invalid date format. Use YYYY-MM-DD format",
        code: "INVALID_DATE_FORMAT" 
      }, { status: 400 });
    }
    
    // Validate date is a real date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().split('T')[0] !== date) {
      return NextResponse.json({ 
        error: "Invalid date. Please provide a valid date in YYYY-MM-DD format",
        code: "INVALID_DATE" 
      }, { status: 400 });
    }
    
    // Get and validate optional classId parameter
    const classIdParam = searchParams.get('classId');
    let classId: number | null = null;
    
    if (classIdParam) {
      const parsedClassId = parseInt(classIdParam);
      if (isNaN(parsedClassId)) {
        return NextResponse.json({ 
          error: "Invalid classId. Must be a valid integer",
          code: "INVALID_CLASS_ID" 
        }, { status: 400 });
      }
      classId = parsedClassId;
    }
    
    // Build query - schedule field will be included automatically in select all
    let query = db.select().from(childcareLogs);
    
    if (classId !== null) {
      // Filter by both date and classId
      query = query.where(and(
        eq(childcareLogs.date, date),
        eq(childcareLogs.classId, classId)
      ));
    } else {
      // Filter by date only
      query = query.where(eq(childcareLogs.date, date));
    }
    
    // Order by createdAt DESC and execute query
    const results = await query.orderBy(desc(childcareLogs.createdAt));
    
    return NextResponse.json(results, { status: 200 });
    
  } catch (error) {
    console.error('GET childcare logs by date error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}