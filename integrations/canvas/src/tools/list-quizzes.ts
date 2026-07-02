import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let listQuizzesTool = SlateTool.create(spec, {
  name: 'List Quizzes',
  key: 'list_quizzes',
  description: `List quizzes in a course. Returns quiz details including title, type, time limit, question count, and point totals. Supports classic Canvas quizzes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('The Canvas course ID'),
      searchTerm: z.string().optional().describe('Partial quiz title to search for')
    })
  )
  .output(
    z.object({
      quizzes: z.array(
        z.object({
          quizId: z.string().describe('Quiz ID'),
          title: z.string().describe('Quiz title'),
          quizType: z
            .string()
            .optional()
            .describe('Quiz type (practice_quiz, assignment, graded_survey, survey)'),
          pointsPossible: z.number().optional().nullable().describe('Total points'),
          questionCount: z.number().optional().describe('Number of questions'),
          timeLimit: z.number().optional().nullable().describe('Time limit in minutes'),
          dueAt: z.string().optional().nullable().describe('Due date'),
          lockAt: z.string().optional().nullable().describe('Lock date'),
          unlockAt: z.string().optional().nullable().describe('Unlock date'),
          published: z.boolean().optional().describe('Whether published'),
          allowedAttempts: z.number().optional().describe('Max attempts (-1 for unlimited)'),
          description: z.string().optional().nullable().describe('Quiz description')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CanvasClient({
      token: ctx.auth.token,
      canvasDomain: ctx.auth.canvasDomain
    });

    let raw = await client.listQuizzes(ctx.input.courseId, {
      searchTerm: ctx.input.searchTerm
    });

    let quizzes = raw.map((q: any) => ({
      quizId: String(q.id),
      title: q.title,
      quizType: q.quiz_type,
      pointsPossible: q.points_possible,
      questionCount: q.question_count,
      timeLimit: q.time_limit,
      dueAt: q.due_at,
      lockAt: q.lock_at,
      unlockAt: q.unlock_at,
      published: q.published,
      allowedAttempts: q.allowed_attempts,
      description: q.description
    }));

    return {
      output: { quizzes },
      message: `Found **${quizzes.length}** quiz(zes) in course ${ctx.input.courseId}.`
    };
  })
  .build();
