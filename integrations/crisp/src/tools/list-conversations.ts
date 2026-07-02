import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `List and search conversations in your Crisp workspace. Supports filtering by status (unread, resolved, assigned), date range, inbox, and text/segment search. Returns paginated conversation summaries with metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)'),
      searchQuery: z.string().optional().describe('Search text to filter conversations'),
      searchType: z
        .enum(['text', 'segment', 'filter'])
        .optional()
        .describe('Type of search to perform'),
      filterUnread: z.boolean().optional().describe('Filter to only unread conversations'),
      filterResolved: z.boolean().optional().describe('Filter to only resolved conversations'),
      filterNotResolved: z
        .boolean()
        .optional()
        .describe('Filter to only unresolved conversations'),
      filterAssigned: z.boolean().optional().describe('Filter to only assigned conversations'),
      filterUnassigned: z
        .boolean()
        .optional()
        .describe('Filter to only unassigned conversations'),
      filterInboxId: z.string().optional().describe('Filter by specific inbox ID'),
      filterDateStart: z
        .string()
        .optional()
        .describe('Filter conversations from this date (ISO 8601)'),
      filterDateEnd: z
        .string()
        .optional()
        .describe('Filter conversations until this date (ISO 8601)')
    })
  )
  .output(
    z.object({
      conversations: z
        .array(
          z.object({
            sessionId: z.string().describe('Session ID of the conversation'),
            state: z
              .string()
              .optional()
              .describe('Conversation state: pending, unresolved, or resolved'),
            isBlocked: z.boolean().optional().describe('Whether the visitor is blocked'),
            nickname: z.string().optional().describe('Visitor nickname'),
            email: z.string().optional().describe('Visitor email'),
            subject: z.string().optional().describe('Conversation subject'),
            preview: z.string().optional().describe('Last message preview text'),
            unreadCount: z.number().optional().describe('Number of unread messages'),
            assignedOperatorId: z.string().optional().describe('Assigned operator user ID'),
            segments: z.array(z.string()).optional().describe('Conversation segments/tags'),
            createdAt: z.string().optional().describe('When the conversation was created'),
            updatedAt: z.string().optional().describe('When the conversation was last updated')
          })
        )
        .describe('List of conversations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, websiteId: ctx.config.websiteId });

    let results = await client.listConversations({
      pageNumber: ctx.input.pageNumber,
      searchQuery: ctx.input.searchQuery,
      searchType: ctx.input.searchType,
      filterUnread: ctx.input.filterUnread,
      filterResolved: ctx.input.filterResolved,
      filterNotResolved: ctx.input.filterNotResolved,
      filterAssigned: ctx.input.filterAssigned,
      filterUnassigned: ctx.input.filterUnassigned,
      filterInboxId: ctx.input.filterInboxId,
      filterDateStart: ctx.input.filterDateStart,
      filterDateEnd: ctx.input.filterDateEnd
    });

    let conversations = (results || []).map((c: any) => ({
      sessionId: c.session_id,
      state: c.state,
      isBlocked: c.is_blocked,
      nickname: c.meta?.nickname,
      email: c.meta?.email,
      subject: c.meta?.subject,
      preview: c.last_message,
      unreadCount: c.unread?.operator,
      assignedOperatorId: c.assigned?.user_id,
      segments: c.meta?.segments,
      createdAt: c.created_at ? String(c.created_at) : undefined,
      updatedAt: c.updated_at ? String(c.updated_at) : undefined
    }));

    return {
      output: { conversations },
      message: `Found **${conversations.length}** conversations${ctx.input.searchQuery ? ` matching "${ctx.input.searchQuery}"` : ''} on page ${ctx.input.pageNumber ?? 1}.`
    };
  })
  .build();
