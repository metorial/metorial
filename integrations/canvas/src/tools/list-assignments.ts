import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let listAssignmentsTool = SlateTool.create(spec, {
  name: 'List Assignments',
  key: 'list_assignments',
  description: `List assignments in a course. Filter by search term, bucket (past, overdue, upcoming, etc.), and sort order. Returns assignment details including due dates, points, submission types, and workflow state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('The Canvas course ID'),
      searchTerm: z.string().optional().describe('Partial assignment name to search for'),
      bucket: z
        .enum(['past', 'overdue', 'undated', 'ungraded', 'unsubmitted', 'upcoming', 'future'])
        .optional()
        .describe('Filter by assignment bucket'),
      orderBy: z.enum(['position', 'name', 'due_at']).optional().describe('Sort order'),
      includeSubmission: z
        .boolean()
        .optional()
        .describe('Include current user submission data')
    })
  )
  .output(
    z.object({
      assignments: z.array(
        z.object({
          assignmentId: z.string().describe('Assignment ID'),
          name: z.string().describe('Assignment name'),
          description: z
            .string()
            .optional()
            .nullable()
            .describe('Assignment description HTML'),
          dueAt: z.string().optional().nullable().describe('Due date'),
          lockAt: z.string().optional().nullable().describe('Lock date'),
          unlockAt: z.string().optional().nullable().describe('Unlock date'),
          pointsPossible: z.number().optional().nullable().describe('Maximum points'),
          gradingType: z.string().optional().describe('Grading type'),
          submissionTypes: z.array(z.string()).optional().describe('Allowed submission types'),
          workflowState: z.string().optional().describe('published or unpublished'),
          assignmentGroupId: z.string().optional().describe('Assignment group ID'),
          position: z.number().optional().nullable().describe('Position in assignment group'),
          hasSubmittedSubmissions: z.boolean().optional().describe('Whether submissions exist')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CanvasClient({
      token: ctx.auth.token,
      canvasDomain: ctx.auth.canvasDomain
    });

    let include: string[] = [];
    if (ctx.input.includeSubmission) include.push('submission');

    let raw = await client.listAssignments(ctx.input.courseId, {
      searchTerm: ctx.input.searchTerm,
      bucket: ctx.input.bucket,
      orderBy: ctx.input.orderBy,
      include: include.length > 0 ? include : undefined
    });

    let assignments = raw.map((a: any) => ({
      assignmentId: String(a.id),
      name: a.name,
      description: a.description,
      dueAt: a.due_at,
      lockAt: a.lock_at,
      unlockAt: a.unlock_at,
      pointsPossible: a.points_possible,
      gradingType: a.grading_type,
      submissionTypes: a.submission_types,
      workflowState: a.workflow_state,
      assignmentGroupId: a.assignment_group_id ? String(a.assignment_group_id) : undefined,
      position: a.position,
      hasSubmittedSubmissions: a.has_submitted_submissions
    }));

    return {
      output: { assignments },
      message: `Found **${assignments.length}** assignment(s) in course ${ctx.input.courseId}.`
    };
  })
  .build();
