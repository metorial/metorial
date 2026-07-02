import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let gradeSubmissionTool = SlateTool.create(spec, {
  name: 'Grade Submission',
  key: 'grade_submission',
  description: `Grade a student's submission or add a comment. Set a grade, excuse the assignment, and/or leave feedback. Use posted_grade format like "95%", "A-", "pass", or a raw point value.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('The Canvas course ID'),
      assignmentId: z.string().describe('The assignment ID'),
      userId: z.string().describe('The student user ID'),
      postedGrade: z
        .string()
        .optional()
        .describe('Grade value (e.g., "95%", "A-", "pass", "8.5")'),
      excuse: z.boolean().optional().describe('Excuse the student from this assignment'),
      comment: z.string().optional().describe('Text comment to add to the submission')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Submission ID'),
      assignmentId: z.string().describe('Assignment ID'),
      userId: z.string().describe('Student user ID'),
      grade: z.string().optional().nullable().describe('Assigned grade'),
      score: z.number().optional().nullable().describe('Numeric score'),
      excused: z.boolean().optional().nullable().describe('Whether the student is excused'),
      workflowState: z.string().optional().describe('Submission workflow state'),
      gradedAt: z.string().optional().nullable().describe('When the submission was graded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CanvasClient({
      token: ctx.auth.token,
      canvasDomain: ctx.auth.canvasDomain
    });

    let result = await client.gradeSubmission(
      ctx.input.courseId,
      ctx.input.assignmentId,
      ctx.input.userId,
      {
        postedGrade: ctx.input.postedGrade,
        excuse: ctx.input.excuse,
        comment: ctx.input.comment
      }
    );

    return {
      output: {
        submissionId: String(result.id),
        assignmentId: String(result.assignment_id),
        userId: String(result.user_id),
        grade: result.grade,
        score: result.score,
        excused: result.excused,
        workflowState: result.workflow_state,
        gradedAt: result.graded_at
      },
      message: `Graded submission for user ${ctx.input.userId} on assignment ${ctx.input.assignmentId}${ctx.input.postedGrade ? ` with grade **${ctx.input.postedGrade}**` : ''}.`
    };
  })
  .build();
