import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { children, observationLogs, developmentEvaluations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      console.error('DELETE /api/children/[id] - Invalid ID provided:', id);
      return NextResponse.json({
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const childId = parseInt(id);
    console.log(`DELETE /api/children/[id] - Starting deletion process for child ID: ${childId}`);

    // Check if child exists
    const existingChild = await db.select()
      .from(children)
      .where(eq(children.id, childId))
      .limit(1);

    if (existingChild.length === 0) {
      console.error(`DELETE /api/children/[id] - Child not found with ID: ${childId}`);
      return NextResponse.json({
        error: 'Child not found',
        code: 'CHILD_NOT_FOUND'
      }, { status: 404 });
    }

    const childToDelete = existingChild[0];
    console.log(`DELETE /api/children/[id] - Found child to delete:`, childToDelete);

    // Perform CASCADE DELETE using transaction
    const result = await db.transaction(async (tx) => {
      console.log(`DELETE /api/children/[id] - Starting transaction for child ID: ${childId}`);

      // Step 1: Delete all development evaluations for the child
      console.log(`DELETE /api/children/[id] - Deleting development evaluations for child ID: ${childId}`);
      const deletedEvaluations = await tx.delete(developmentEvaluations)
        .where(eq(developmentEvaluations.childId, childId))
        .returning();

      console.log(`DELETE /api/children/[id] - Deleted ${deletedEvaluations.length} development evaluations`);

      // Step 2: Delete all observation logs for the child
      console.log(`DELETE /api/children/[id] - Deleting observation logs for child ID: ${childId}`);
      const deletedLogs = await tx.delete(observationLogs)
        .where(eq(observationLogs.childId, childId))
        .returning();

      console.log(`DELETE /api/children/[id] - Deleted ${deletedLogs.length} observation logs`);

      // Step 3: Delete the child record itself
      console.log(`DELETE /api/children/[id] - Deleting child record for ID: ${childId}`);
      const deletedChild = await tx.delete(children)
        .where(eq(children.id, childId))
        .returning();

      console.log(`DELETE /api/children/[id] - Deleted child record:`, deletedChild[0]);

      return {
        deletedChild: deletedChild[0],
        deletedEvaluationsCount: deletedEvaluations.length,
        deletedLogsCount: deletedLogs.length,
        deletedEvaluations,
        deletedLogs
      };
    });

    console.log(`DELETE /api/children/[id] - Transaction completed successfully for child ID: ${childId}`);
    console.log(`DELETE /api/children/[id] - Deletion summary:`, {
      childId,
      childName: result.deletedChild.name,
      evaluationsDeleted: result.deletedEvaluationsCount,
      logsDeleted: result.deletedLogsCount
    });

    return NextResponse.json({
      message: 'Child and all related records deleted successfully',
      deletedChild: result.deletedChild,
      deletedRecordCounts: {
        developmentEvaluations: result.deletedEvaluationsCount,
        observationLogs: result.deletedLogsCount
      },
      details: {
        deletedDevelopmentEvaluations: result.deletedEvaluations,
        deletedObservationLogs: result.deletedLogs
      }
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE /api/children/[id] - Database error:', error);
    console.error('DELETE /api/children/[id] - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({
      error: 'Internal server error: Failed to delete child and related records',
      code: 'DATABASE_ERROR'
    }, { status: 500 });
  }
}