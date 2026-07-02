import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { spec } from '../spec';

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `Retrieve paginated conversation sessions for a bot. Returns conversation summaries including title, sentiment, resolution status, escalation status, and timestamps. Use **Get Conversation** to retrieve full message history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: z.string().describe('Bot ID to list conversations for'),
      page: z.number().optional().describe('Page number (zero-indexed, default: 0)'),
      perPage: z.number().optional().describe('Results per page (default: 25)')
    })
  )
  .output(
    z.object({
      conversations: z.array(
        z.object({
          conversationId: z.string().describe('Conversation identifier'),
          title: z.string().optional().describe('Conversation title'),
          createdAt: z.string().describe('ISO 8601 creation timestamp'),
          updatedAt: z.string().describe('ISO 8601 last update timestamp'),
          model: z.string().optional().describe('AI model used'),
          answered: z.boolean().optional().describe('Whether the bot answered successfully'),
          summary: z.string().optional().describe('Auto-generated conversation summary'),
          sentiment: z
            .string()
            .optional()
            .describe('Sentiment: positive, negative, or neutral'),
          resolved: z
            .string()
            .optional()
            .describe('Resolution status: resolved, unresolved, confirmed, assumed'),
          escalated: z
            .string()
            .optional()
            .describe('Escalation status: handled, triggered, none'),
          alias: z.string().optional().describe('Anonymous username')
        })
      ),
      totalCount: z.number().describe('Total number of conversations'),
      hasMorePages: z.boolean().describe('Whether more pages are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);
    let result = await client.listConversations(ctx.config.teamId, ctx.input.botId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let conversations = result.conversations.map(c => ({
      conversationId: c.id,
      title: c.title ?? undefined,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      model: c.model ?? undefined,
      answered: c.answered,
      summary: c.summary ?? undefined,
      sentiment: c.sentiment ?? undefined,
      resolved: c.resolved,
      escalated: c.escalated,
      alias: c.alias
    }));

    return {
      output: {
        conversations,
        totalCount: result.pagination.totalCount,
        hasMorePages: result.pagination.hasMorePages
      },
      message: `Retrieved **${conversations.length}** conversations (page ${(ctx.input.page ?? 0) + 1}, ${result.pagination.totalCount} total)`
    };
  })
  .build();
