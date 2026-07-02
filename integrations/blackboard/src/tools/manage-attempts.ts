import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attemptOutputSchema = z.object({
  attemptId: z.string().describe('Attempt ID'),
  userId: z.string().describe('User ID'),
  status: z.string().optional().describe('Attempt status'),
  score: z.number().optional().describe('Score awarded'),
  text: z.string().optional().describe('Text submission'),
  feedback: z.string().optional().describe('Instructor feedback'),
  notes: z.string().optional().describe('Instructor notes'),
  studentComments: z.string().optional().describe('Student comments'),
  exempt: z.boolean().optional().describe('Whether the attempt is exempt'),
  created: z.string().optional().describe('Submission timestamp'),
  modified: z.string().optional().describe('Last modified timestamp')
});

let mapAttempt = (a: any) => ({
  attemptId: a.id,
  userId: a.userId,
  status: a.status,
  score: a.score,
  text: a.text,
  feedback: a.feedback,
  notes: a.notes,
  studentComments: a.studentComments,
  exempt: a.exempt,
  created: a.created,
  modified: a.modified
});

export let listAttempts = SlateTool.create(spec, {
  name: 'List Assignment Attempts',
  key: 'list_attempts',
  description: `List student attempts (submissions) for a grade column. Optionally filter by a specific user.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      columnId: z.string().describe('Grade column ID'),
      userId: z.string().optional().describe('Filter by user ID'),
      offset: z.number().optional().describe('Number of items to skip'),
      limit: z.number().optional().describe('Maximum results to return')
    })
  )
  .output(
    z.object({
      attempts: z.array(attemptOutputSchema),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let result = await client.listColumnAttempts(ctx.input.courseId, ctx.input.columnId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      userId: ctx.input.userId
    });

    let attempts = (result.results || []).map(mapAttempt);
    return {
      output: { attempts, hasMore: !!result.paging?.nextPage },
      message: `Found **${attempts.length}** attempt(s).`
    };
  })
  .build();

export let getAttempt = SlateTool.create(spec, {
  name: 'Get Assignment Attempt',
  key: 'get_attempt',
  description: `Get details of a specific assignment attempt (submission).`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      columnId: z.string().describe('Grade column ID'),
      attemptId: z.string().describe('Attempt ID')
    })
  )
  .output(attemptOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let attempt = await client.getAttempt(
      ctx.input.courseId,
      ctx.input.columnId,
      ctx.input.attemptId
    );

    return {
      output: mapAttempt(attempt),
      message: `Retrieved attempt **${attempt.id}** by user **${attempt.userId}** with status **${attempt.status || 'N/A'}**.`
    };
  })
  .build();

export let gradeAttempt = SlateTool.create(spec, {
  name: 'Grade Assignment Attempt',
  key: 'grade_attempt',
  description: `Grade a student's assignment attempt. Set the score, provide feedback, and update the status.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      columnId: z.string().describe('Grade column ID'),
      attemptId: z.string().describe('Attempt ID'),
      score: z.number().optional().describe('Score to award'),
      status: z.string().optional().describe('New status (e.g., "Completed")'),
      feedback: z.string().optional().describe('Feedback for the student'),
      notes: z.string().optional().describe('Instructor-only notes'),
      exempt: z.boolean().optional().describe('Whether to mark as exempt')
    })
  )
  .output(attemptOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let attempt = await client.updateAttempt(
      ctx.input.courseId,
      ctx.input.columnId,
      ctx.input.attemptId,
      {
        score: ctx.input.score,
        status: ctx.input.status,
        feedback: ctx.input.feedback,
        notes: ctx.input.notes,
        exempt: ctx.input.exempt
      }
    );

    return {
      output: mapAttempt(attempt),
      message: `Graded attempt **${attempt.id}**: score **${attempt.score ?? 'N/A'}**.`
    };
  })
  .build();
