import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let listSubmissionsTool = SlateTool.create(spec, {
  name: 'List Submissions',
  key: 'list_submissions',
  description: `List all submissions for an assignment in a course. Returns submission details including grade, score, workflow state, and submission timestamp. Optionally include user details and comments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('The Canvas course ID'),
      assignmentId: z.string().describe('The assignment ID'),
      includeUser: z.boolean().optional().describe('Include submitting user details'),
      includeComments: z.boolean().optional().describe('Include submission comments'),
      includeRubricAssessment: z
        .boolean()
        .optional()
        .describe('Include rubric assessment details')
    })
  )
  .output(
    z.object({
      submissions: z.array(
        z.object({
          submissionId: z.string().describe('Submission ID'),
          assignmentId: z.string().describe('Assignment ID'),
          userId: z.string().describe('Student user ID'),
          userName: z.string().optional().nullable().describe('Student name'),
          submittedAt: z.string().optional().nullable().describe('Submission timestamp'),
          grade: z.string().optional().nullable().describe('Assigned grade'),
          score: z.number().optional().nullable().describe('Numeric score'),
          excused: z.boolean().optional().nullable().describe('Whether excused'),
          late: z.boolean().optional().describe('Whether submitted late'),
          missing: z.boolean().optional().describe('Whether submission is missing'),
          workflowState: z
            .string()
            .optional()
            .describe('Submission state (submitted, graded, pending_review, unsubmitted)'),
          submissionType: z.string().optional().nullable().describe('Type of submission'),
          attempt: z.number().optional().nullable().describe('Submission attempt number'),
          gradedAt: z.string().optional().nullable().describe('When graded')
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
    if (ctx.input.includeUser) include.push('user');
    if (ctx.input.includeComments) include.push('submission_comments');
    if (ctx.input.includeRubricAssessment) include.push('rubric_assessment');

    let raw = await client.listSubmissions(ctx.input.courseId, ctx.input.assignmentId, {
      include: include.length > 0 ? include : undefined
    });

    let submissions = raw.map((s: any) => ({
      submissionId: String(s.id),
      assignmentId: String(s.assignment_id),
      userId: String(s.user_id),
      userName: s.user?.name,
      submittedAt: s.submitted_at,
      grade: s.grade,
      score: s.score,
      excused: s.excused,
      late: s.late,
      missing: s.missing,
      workflowState: s.workflow_state,
      submissionType: s.submission_type,
      attempt: s.attempt,
      gradedAt: s.graded_at
    }));

    return {
      output: { submissions },
      message: `Found **${submissions.length}** submission(s) for assignment ${ctx.input.assignmentId}.`
    };
  })
  .build();
