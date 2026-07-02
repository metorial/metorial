import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { spec } from '../spec';

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `List conversations in Drift with optional status filtering and pagination. Returns conversations sorted by most recently updated.`,
  constraints: [
    'Maximum 50 conversations per request.',
    'Organizations with very high volume may experience timeouts.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['open', 'closed', 'pending'])
        .optional()
        .describe('Filter by conversation status'),
      limit: z
        .number()
        .optional()
        .describe('Max conversations to return (max 50, default 25)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      conversations: z.array(
        z.object({
          conversationId: z.number().describe('Drift conversation ID'),
          status: z.string().optional().describe('Conversation status'),
          contactId: z.number().optional().describe('Associated contact ID'),
          createdAt: z.number().optional().describe('Unix timestamp of creation'),
          updatedAt: z.number().optional().describe('Unix timestamp of last update'),
          inboxId: z.number().optional().describe('Inbox ID'),
          participants: z
            .array(z.number())
            .optional()
            .describe('List of participant user IDs'),
          conversationTags: z
            .array(
              z.object({
                name: z.string(),
                color: z.string().optional()
              })
            )
            .optional()
            .describe('Tags applied to the conversation')
        })
      ),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);

    let statusMap: Record<string, number> = { open: 1, closed: 2, pending: 3 };
    let statusId = ctx.input.status ? [statusMap[ctx.input.status]!] : undefined;

    let result = await client.listConversations({
      limit: ctx.input.limit,
      next: ctx.input.cursor,
      statusId
    });

    return {
      output: {
        conversations: result.conversations.map((c: any) => ({
          conversationId: c.id,
          status: c.status,
          contactId: c.contactId,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          inboxId: c.inboxId,
          participants: c.participants,
          conversationTags: c.conversationTags
        })),
        hasMore: result.pagination?.more ?? false,
        nextCursor: result.pagination?.next
      },
      message: `Retrieved **${result.conversations.length}** conversation(s).${result.pagination?.more ? ' More results available.' : ''}`
    };
  })
  .build();
