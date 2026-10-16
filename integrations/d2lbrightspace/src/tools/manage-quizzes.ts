import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { richText } from '../lib/response';
import { spec } from '../spec';

export let listQuizzes = SlateTool.create(spec, {
  name: 'List Quizzes',
  key: 'list_quizzes',
  description: `List all quizzes in a course. Returns quiz names, dates, attempt limits, time constraints, and grade information.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId: z
        .string()
        .describe(
          'Course org unit ID. Call list_enrollments or list_org_units to discover IDs.'
        )
    })
  )
  .output(
    z.object({
      quizzes: z
        .array(
          z.object({
            quizId: z.string().describe('Quiz ID'),
            name: z.string().optional().describe('Quiz name'),
            isActive: z.boolean().optional().describe('Whether the quiz is active'),
            startDate: z.string().optional().describe('Start date'),
            endDate: z.string().optional().describe('End date'),
            dueDate: z.string().optional().describe('Due date'),
            attemptsAllowed: z.number().optional().describe('Number of attempts allowed'),
            timeLimitMinutes: z.number().optional().describe('Time limit in minutes'),
            gradeItemId: z.string().optional().describe('Associated grade item ID')
          })
        )
        .describe('List of quizzes')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.listQuizzes(ctx.input.orgUnitId);

    let items = Array.isArray(result) ? result : result?.Objects || [];
    let quizzes = items.map((q: any) => ({
      quizId: String(q.QuizId),
      name: q.Name ?? undefined,
      isActive: q.IsActive ?? undefined,
      startDate: q.StartDate ?? undefined,
      endDate: q.EndDate ?? undefined,
      dueDate: q.DueDate ?? undefined,
      attemptsAllowed: q.AttemptsAllowed?.NumberOfAttemptsAllowed ?? undefined,
      timeLimitMinutes: q.SubmissionTimeLimit?.TimeLimitValue ?? undefined,
      gradeItemId: q.GradeItemId ? String(q.GradeItemId) : undefined
    }));

    return {
      output: { quizzes },
      message: `Found **${quizzes.length}** quiz(zes) in org unit ${ctx.input.orgUnitId}.`
    };
  })
  .build();

export let getQuiz = SlateTool.create(spec, {
  name: 'Get Quiz',
  key: 'get_quiz',
  description: `Get detailed information about a specific quiz, including its configuration, questions, and attempts.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId: z
        .string()
        .describe(
          'Course org unit ID. Call list_enrollments or list_org_units to discover IDs.'
        ),
      quizId: z.string().describe('Quiz ID'),
      includeAttempts: z.boolean().optional().describe('Also include quiz attempts'),
      includeQuestions: z.boolean().optional().describe('Also include quiz questions')
    })
  )
  .output(
    z.object({
      quizId: z.string().describe('Quiz ID'),
      name: z.string().optional().describe('Quiz name'),
      isActive: z.boolean().optional().describe('Whether the quiz is active'),
      description: z.string().optional().describe('Quiz description'),
      startDate: z.string().optional().describe('Start date'),
      endDate: z.string().optional().describe('End date'),
      dueDate: z.string().optional().describe('Due date'),
      attemptsAllowed: z.number().optional().describe('Attempts allowed'),
      timeLimitMinutes: z.number().optional().describe('Time limit in minutes'),
      attempts: z
        .array(
          z.object({
            attemptId: z.string().describe('Attempt ID'),
            userId: z.string().optional().describe('User ID'),
            score: z.number().optional().describe('Attempt score'),
            isCompleted: z.boolean().optional().describe('Whether the attempt is completed'),
            startedDate: z.string().optional().describe('When the attempt started'),
            completedDate: z.string().optional().describe('When the attempt was completed')
          })
        )
        .optional()
        .describe('Quiz attempts'),
      questions: z
        .array(
          z.object({
            questionId: z.string().describe('Question ID'),
            questionText: z.string().optional().describe('Question text'),
            questionType: z.number().optional().describe('Question type'),
            points: z.number().optional().describe('Points value')
          })
        )
        .optional()
        .describe('Quiz questions')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let quiz = await client.getQuiz(ctx.input.orgUnitId, ctx.input.quizId);

    let attempts: any[] | undefined;
    if (ctx.input.includeAttempts) {
      let attResult = await client.getQuizAttempts(ctx.input.orgUnitId, ctx.input.quizId);
      let attItems = Array.isArray(attResult) ? attResult : attResult?.Objects || [];
      attempts = attItems.map((a: any) => ({
        attemptId: String(a.AttemptId),
        userId: a.UserId ? String(a.UserId) : undefined,
        score: a.Score ?? undefined,
        isCompleted: a.Completed != null,
        startedDate: a.Started ?? undefined,
        completedDate: a.Completed ?? undefined
      }));
    }

    let questions: any[] | undefined;
    if (ctx.input.includeQuestions) {
      let qResult = await client.getQuizQuestions(ctx.input.orgUnitId, ctx.input.quizId);
      let qItems = Array.isArray(qResult) ? qResult : qResult?.Objects || [];
      questions = qItems.map((q: any) => ({
        questionId: String(q.QuestionId),
        questionText: richText(q.QuestionInfo?.QuestionText ?? q.QuestionText),
        questionType: q.QuestionTypeId ?? undefined,
        points: q.Points ?? undefined
      }));
    }

    return {
      output: {
        quizId: String(quiz.QuizId),
        name: quiz.Name ?? undefined,
        isActive: quiz.IsActive ?? undefined,
        description: richText(quiz.Description?.Text),
        startDate: quiz.StartDate ?? undefined,
        endDate: quiz.EndDate ?? undefined,
        dueDate: quiz.DueDate ?? undefined,
        attemptsAllowed: quiz.AttemptsAllowed?.NumberOfAttemptsAllowed ?? undefined,
        timeLimitMinutes: quiz.SubmissionTimeLimit?.TimeLimitValue ?? undefined,
        attempts,
        questions
      },
      message: `Retrieved quiz **${quiz.Name}** (ID: ${quiz.QuizId}).`
    };
  })
  .build();
