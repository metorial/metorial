import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listQuizzes = SlateTool.create(spec, {
  name: 'List Quizzes',
  key: 'list_quizzes',
  description: `List all quizzes in a course. Returns quiz names, dates, attempt limits, time constraints, and grade information.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID')
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
      name: q.Name,
      isActive: q.IsActive,
      startDate: q.StartDate,
      endDate: q.EndDate,
      dueDate: q.DueDate,
      attemptsAllowed: q.AttemptsAllowed?.NumberOfAttemptsAllowed,
      timeLimitMinutes: q.TimeLimit?.TimeLimit,
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
      orgUnitId: z.string().describe('Course org unit ID'),
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
        score: a.Score,
        isCompleted: a.IsCompleted,
        startedDate: a.AttemptedDateTime,
        completedDate: a.CompletedDateTime
      }));
    }

    let questions: any[] | undefined;
    if (ctx.input.includeQuestions) {
      let qResult = await client.getQuizQuestions(ctx.input.orgUnitId, ctx.input.quizId);
      let qItems = Array.isArray(qResult) ? qResult : qResult?.Objects || [];
      questions = qItems.map((q: any) => ({
        questionId: String(q.QuestionId),
        questionText: q.QuestionText?.Text || q.QuestionText?.Content,
        questionType: q.QuestionTypeId,
        points: q.Points
      }));
    }

    return {
      output: {
        quizId: String(quiz.QuizId),
        name: quiz.Name,
        isActive: quiz.IsActive,
        description: quiz.Description?.Text || quiz.Description?.Content,
        startDate: quiz.StartDate,
        endDate: quiz.EndDate,
        dueDate: quiz.DueDate,
        attemptsAllowed: quiz.AttemptsAllowed?.NumberOfAttemptsAllowed,
        timeLimitMinutes: quiz.TimeLimit?.TimeLimit,
        attempts,
        questions
      },
      message: `Retrieved quiz **${quiz.Name}** (ID: ${quiz.QuizId}).`
    };
  })
  .build();
