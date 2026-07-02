import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotChatClient } from '../lib/client';
import { spec } from '../spec';

export let askQuestion = SlateTool.create(spec, {
  name: 'Ask Question',
  key: 'ask_question',
  description: `Send a question to a DocsBot AI agent and receive an answer with source citations. Supports multi-turn conversations by reusing the same conversationId, multimodal inputs via image URLs, and configurable parameters like reasoning effort and context items.`,
  instructions: [
    'Generate a unique conversationId (UUID) for new conversations. Reuse the same conversationId for follow-up questions in the same conversation.',
    'The response contains events with different types: "answer" for simple responses, "lookup_answer" for answers with source citations.'
  ]
})
  .input(
    z.object({
      botId: z.string().describe('Bot ID to ask the question to'),
      conversationId: z
        .string()
        .describe(
          'Conversation ID (UUID). Use a new UUID for new conversations or reuse for follow-ups.'
        ),
      question: z.string().describe('The question to ask (2-8000 tokens depending on auth)'),
      userName: z.string().optional().describe('User name for metadata'),
      userEmail: z.string().optional().describe('User email for metadata'),
      contextItems: z
        .number()
        .optional()
        .describe('Number of source items for context (default: 5, context boost: 16)'),
      humanEscalation: z
        .boolean()
        .optional()
        .describe('Enable human support escalation classifier'),
      followupRating: z
        .boolean()
        .optional()
        .describe('Include rating feedback tool in response'),
      fullSource: z.boolean().optional().describe('Return full source content in citations'),
      imageUrls: z
        .array(z.string())
        .optional()
        .describe('Image URLs for multimodal context (GPT-4o+ models)'),
      model: z.string().optional().describe("Override the bot's AI model"),
      reasoningEffort: z
        .enum(['none', 'minimal', 'low', 'medium', 'high'])
        .optional()
        .describe('Depth of reasoning'),
      searchLimit: z.number().optional().describe('Max tool searches (1-4, default: 2)')
    })
  )
  .output(
    z.object({
      events: z.array(
        z.object({
          eventType: z
            .string()
            .describe(
              'Event type (answer, lookup_answer, is_resolved_question, support_escalation)'
            ),
          answer: z.string().optional().describe('The AI-generated answer'),
          answerId: z.string().optional().describe('Answer ID for rating or escalation'),
          couldAnswer: z
            .boolean()
            .optional()
            .describe('Whether the bot could answer the question'),
          sources: z
            .array(
              z.object({
                type: z.string().describe('Source type'),
                title: z.string().describe('Source title'),
                url: z.string().optional().describe('Source URL'),
                page: z.string().optional().describe('Page reference'),
                used: z
                  .boolean()
                  .optional()
                  .describe('Whether this source was used in the answer')
              })
            )
            .optional()
            .describe('Source citations')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotChatClient(ctx.auth.token);

    let metadata: { name?: string; email?: string } | undefined;
    if (ctx.input.userName || ctx.input.userEmail) {
      metadata = {};
      if (ctx.input.userName) metadata.name = ctx.input.userName;
      if (ctx.input.userEmail) metadata.email = ctx.input.userEmail;
    }

    let chatEvents = await client.chatAgent(ctx.config.teamId, ctx.input.botId, {
      conversationId: ctx.input.conversationId,
      question: ctx.input.question,
      metadata,
      contextItems: ctx.input.contextItems,
      humanEscalation: ctx.input.humanEscalation,
      followupRating: ctx.input.followupRating,
      fullSource: ctx.input.fullSource,
      imageUrls: ctx.input.imageUrls,
      model: ctx.input.model,
      reasoningEffort: ctx.input.reasoningEffort,
      searchLimit: ctx.input.searchLimit
    });

    let events = chatEvents.map(e => ({
      eventType: e.event,
      answer: e.data.answer,
      answerId: e.data.id,
      couldAnswer: e.data.couldAnswer,
      sources: e.data.sources?.map(s => ({
        type: s.type,
        title: s.title,
        url: s.url ?? undefined,
        page: s.page ?? undefined,
        used: s.used
      }))
    }));

    let mainEvent = events.find(e => e.answer);
    let answerPreview = mainEvent?.answer
      ? mainEvent.answer.substring(0, 200) + (mainEvent.answer.length > 200 ? '...' : '')
      : 'No answer generated';

    return {
      output: { events },
      message: `**Answer:** ${answerPreview}`
    };
  })
  .build();
