import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { spec } from '../spec';

export let listQuestions = SlateTool.create(spec, {
  name: 'List Questions',
  key: 'list_questions',
  description: `Retrieve question and answer history for a bot. Supports filtering by rating, escalation status, answer capability, date range, and IP hash. Returns paginated results with question text, answer, sources, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: z.string().describe('Bot ID to list questions for'),
      page: z.number().optional().describe('Page number (zero-indexed, default: 0)'),
      perPage: z.number().optional().describe('Questions per page (default: 50)'),
      ascending: z
        .boolean()
        .optional()
        .describe('Sort order (default: false for newest first)'),
      rating: z
        .enum(['positive', 'negative', 'neutral'])
        .optional()
        .describe('Filter by rating'),
      escalated: z.boolean().optional().describe('Filter for escalated questions'),
      couldAnswer: z.boolean().optional().describe('Filter by whether the bot could answer'),
      startDate: z.string().optional().describe('Filter start date (e.g. "2024-01-01")'),
      endDate: z.string().optional().describe('Filter end date (e.g. "2024-12-31")')
    })
  )
  .output(
    z.object({
      questions: z.array(
        z.object({
          questionId: z.string().describe('Question identifier'),
          createdAt: z.string().describe('ISO 8601 timestamp'),
          alias: z.string().describe('Anonymous username'),
          question: z.string().describe('User question text'),
          answer: z.string().describe('Bot answer in Markdown'),
          rating: z.number().describe('Rating: -1 (negative), 0 (neutral), 1 (positive)'),
          escalation: z.boolean().describe('Whether support was escalated'),
          couldAnswer: z.boolean().optional().describe('Whether the bot could answer'),
          metadata: z.record(z.string(), z.string()).optional().describe('User metadata')
        })
      ),
      totalCount: z.number().describe('Total number of questions'),
      hasMorePages: z.boolean().describe('Whether more pages are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);

    let ratingValue: number | undefined;
    if (ctx.input.rating === 'positive') ratingValue = 1;
    else if (ctx.input.rating === 'negative') ratingValue = -1;
    else if (ctx.input.rating === 'neutral') ratingValue = 0;

    let result = await client.listQuestions(ctx.config.teamId, ctx.input.botId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      ascending: ctx.input.ascending,
      rating: ratingValue,
      escalated: ctx.input.escalated,
      couldAnswer: ctx.input.couldAnswer,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    let questions = result.questions.map(q => ({
      questionId: q.id,
      createdAt: q.createdAt,
      alias: q.alias,
      question: q.question,
      answer: q.answer,
      rating: q.rating,
      escalation: q.escalation,
      couldAnswer: q.couldAnswer ?? undefined,
      metadata: q.metadata
    }));

    return {
      output: {
        questions,
        totalCount: result.pagination.totalCount,
        hasMorePages: result.pagination.hasMorePages
      },
      message: `Retrieved **${questions.length}** questions (page ${(ctx.input.page ?? 0) + 1}, ${result.pagination.totalCount} total)`
    };
  })
  .build();
