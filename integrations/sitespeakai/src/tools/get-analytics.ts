import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { chatbotIdSchema } from '../lib/schemas';
import { spec } from '../spec';

let analyticsSchema = z.object({
  fromDate: z.string().describe('Start date of the reported period.'),
  toDate: z.string().describe('End date of the reported period.'),
  totalConversations: z.number().describe('Total conversations in the period.'),
  averageConversationsPerDay: z.number().describe('Average daily conversation count.'),
  answeredQuestionsPercentage: z.number().describe('Percentage of questions answered.'),
  negativeSentimentPercentage: z.number().describe('Percentage with negative sentiment.'),
  messagesPerConversation: z.number().describe('Average messages per conversation.'),
  positiveFeedback: z.number().describe('Positive feedback count.'),
  negativeFeedback: z.number().describe('Negative feedback count.'),
  uniqueLinkClicks: z.number().describe('Unique link clicks in the period.'),
  leads: z.number().nullable().describe('Captured leads, or null without contact permission.'),
  previousPeriodConversations: z.number().describe('Conversations in the preceding period.'),
  previousPeriodAnsweredQuestionsPercentage: z
    .number()
    .describe('Answered question percentage in the preceding period.'),
  previousPeriodNegativeSentimentPercentage: z
    .number()
    .describe('Negative sentiment percentage in the preceding period.'),
  previousPeriodMessagesPerConversation: z
    .number()
    .describe('Average messages per conversation in the preceding period.'),
  previousPeriodPositiveFeedback: z.number().describe('Previous positive feedback count.'),
  previousPeriodNegativeFeedback: z.number().describe('Previous negative feedback count.'),
  conversationsPerDay: z
    .record(z.string(), z.number())
    .describe('Conversation counts keyed by date.'),
  popular: z
    .record(z.string(), z.unknown())
    .describe('Top links, categories, events, and visitor countries, with up to 10 each.'),
  insights: z
    .record(z.string(), z.unknown())
    .nullable()
    .describe('Question summaries. Answered and unanswered insights can each be null.')
});

let dateSchema = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);

export let getAnalytics = SlateTool.create(spec, {
  name: 'Get Chatbot Analytics',
  key: 'get_analytics',
  description:
    'Retrieve chatbot conversation volume, answer rates, feedback, leads, popular content, and question insights for a date range. Call list_chatbots first to discover chatbot IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      chatbotId: chatbotIdSchema,
      from: z
        .string()
        .optional()
        .describe('ISO 8601 start date, such as 2026-06-01. Defaults to 30 days ago.'),
      to: z
        .string()
        .optional()
        .describe(
          'ISO 8601 end date. Defaults to today. The provider caps the range at 366 days.'
        )
    })
  )
  .output(analyticsSchema)
  .handleInvocation(async ctx => {
    for (let [field, value] of Object.entries({ from: ctx.input.from, to: ctx.input.to })) {
      if (value !== undefined && !dateSchema.safeParse(value).success) {
        throw createApiServiceError(`The ${field} date must be a valid ISO 8601 date.`);
      }
    }
    if (
      ctx.input.from !== undefined &&
      ctx.input.to !== undefined &&
      Date.parse(ctx.input.from) > Date.parse(ctx.input.to)
    ) {
      throw createApiServiceError('The start date must be on or before the end date.');
    }

    let client = new Client({ token: ctx.auth.token });
    let data = await client.getAnalytics(ctx.input.chatbotId, {
      from: ctx.input.from,
      to: ctx.input.to
    });
    let analytics = analyticsSchema.safeParse(data);
    if (!analytics.success) {
      throw createApiServiceError('SiteSpeakAI returned an invalid analytics response.', {
        reason: 'sitespeakai_invalid_response'
      });
    }

    return {
      output: analytics.data,
      message: `Retrieved analytics for ${analytics.data.fromDate} through ${analytics.data.toDate}.`
    };
  })
  .build();
