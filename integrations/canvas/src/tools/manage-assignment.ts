import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let manageAssignmentTool = SlateTool.create(spec, {
  name: 'Manage Assignment',
  key: 'manage_assignment',
  description: `Create, update, or delete an assignment in a course. Configure submission types, due dates, points, grading type, and more. Supports online upload, text entry, URL, media recording, and external tool submission types.`,
  instructions: [
    'To create an assignment, set action to "create" and provide at minimum a name.',
    'To update, set action to "update" and provide the assignmentId plus fields to change.',
    'To delete, set action to "delete" and provide the assignmentId.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('The Canvas course ID'),
      assignmentId: z
        .string()
        .optional()
        .describe('Assignment ID (required for update/delete)'),
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      name: z.string().optional().describe('Assignment name'),
      description: z.string().optional().describe('Assignment description (HTML)'),
      dueAt: z.string().optional().nullable().describe('Due date (ISO 8601)'),
      lockAt: z
        .string()
        .optional()
        .nullable()
        .describe('Lock date - no submissions after (ISO 8601)'),
      unlockAt: z
        .string()
        .optional()
        .nullable()
        .describe('Unlock date - available from (ISO 8601)'),
      pointsPossible: z.number().optional().describe('Maximum points'),
      gradingType: z
        .enum(['pass_fail', 'percent', 'letter_grade', 'gpa_scale', 'points', 'not_graded'])
        .optional()
        .describe('Grading scheme type'),
      submissionTypes: z
        .array(
          z.enum([
            'online_quiz',
            'none',
            'on_paper',
            'discussion_topic',
            'external_tool',
            'online_upload',
            'online_text_entry',
            'online_url',
            'media_recording',
            'student_annotation'
          ])
        )
        .optional()
        .describe('Allowed submission types'),
      allowedExtensions: z
        .array(z.string())
        .optional()
        .describe('Allowed file extensions for upload (e.g., ["pdf", "docx"])'),
      assignmentGroupId: z
        .string()
        .optional()
        .describe('Assignment group ID to place this in'),
      published: z.boolean().optional().describe('Whether the assignment is published'),
      peerReviews: z.boolean().optional().describe('Enable peer reviews'),
      omitFromFinalGrade: z
        .boolean()
        .optional()
        .describe('Exclude from final grade calculation'),
      position: z.number().optional().describe('Position in the assignment group')
    })
  )
  .output(
    z.object({
      assignmentId: z.string().describe('Assignment ID'),
      courseId: z.string().describe('Course ID'),
      name: z.string().describe('Assignment name'),
      dueAt: z.string().optional().nullable().describe('Due date'),
      pointsPossible: z.number().optional().nullable().describe('Maximum points'),
      gradingType: z.string().optional().describe('Grading type'),
      workflowState: z.string().optional().describe('published or unpublished'),
      submissionTypes: z.array(z.string()).optional().describe('Allowed submission types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CanvasClient({
      token: ctx.auth.token,
      canvasDomain: ctx.auth.canvasDomain
    });

    let assignmentData: Record<string, any> = {};
    if (ctx.input.name) assignmentData.name = ctx.input.name;
    if (ctx.input.description) assignmentData.description = ctx.input.description;
    if (ctx.input.dueAt !== undefined) assignmentData.due_at = ctx.input.dueAt;
    if (ctx.input.lockAt !== undefined) assignmentData.lock_at = ctx.input.lockAt;
    if (ctx.input.unlockAt !== undefined) assignmentData.unlock_at = ctx.input.unlockAt;
    if (ctx.input.pointsPossible !== undefined)
      assignmentData.points_possible = ctx.input.pointsPossible;
    if (ctx.input.gradingType) assignmentData.grading_type = ctx.input.gradingType;
    if (ctx.input.submissionTypes) assignmentData.submission_types = ctx.input.submissionTypes;
    if (ctx.input.allowedExtensions)
      assignmentData.allowed_extensions = ctx.input.allowedExtensions;
    if (ctx.input.assignmentGroupId)
      assignmentData.assignment_group_id = ctx.input.assignmentGroupId;
    if (ctx.input.published !== undefined) assignmentData.published = ctx.input.published;
    if (ctx.input.peerReviews !== undefined)
      assignmentData.peer_reviews = ctx.input.peerReviews;
    if (ctx.input.omitFromFinalGrade !== undefined)
      assignmentData.omit_from_final_grade = ctx.input.omitFromFinalGrade;
    if (ctx.input.position !== undefined) assignmentData.position = ctx.input.position;

    let result: any;
    let actionDesc: string;

    if (ctx.input.action === 'create') {
      result = await client.createAssignment(ctx.input.courseId, assignmentData);
      actionDesc = 'Created';
    } else if (ctx.input.action === 'update') {
      if (!ctx.input.assignmentId) throw new Error('assignmentId is required for update');
      result = await client.updateAssignment(
        ctx.input.courseId,
        ctx.input.assignmentId,
        assignmentData
      );
      actionDesc = 'Updated';
    } else {
      if (!ctx.input.assignmentId) throw new Error('assignmentId is required for delete');
      result = await client.deleteAssignment(ctx.input.courseId, ctx.input.assignmentId);
      actionDesc = 'Deleted';
    }

    return {
      output: {
        assignmentId: String(result.id),
        courseId: String(result.course_id),
        name: result.name,
        dueAt: result.due_at,
        pointsPossible: result.points_possible,
        gradingType: result.grading_type,
        workflowState: result.workflow_state,
        submissionTypes: result.submission_types
      },
      message: `${actionDesc} assignment **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
