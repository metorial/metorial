import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { booleanOrUndefined, stringOrUndefined, timestampOrUndefined } from '../lib/output';
import { spec } from '../spec';

export let searchConversations = SlateTool.create(spec, {
  name: 'Search Conversations',
  key: 'search_conversations',
  description: `Search and list conversations using Intercom's query language or list recent conversations with pagination.
Supports filtering by fields like source.author.id, state, read, priority, assignee, and more.`,
  instructions: [
    'Use "search" mode with a query for filtered results.',
    'Use "list" mode to get recent conversations with pagination.',
    'Common query fields: "source.author.id", "state", "read", "open", "priority", "assignee.id".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z
        .enum(['list', 'search'])
        .default('list')
        .describe('Whether to list all conversations or search'),
      query: z.any().optional().describe('Search query using Intercom filter syntax'),
      perPage: z.number().optional().describe('Results per page'),
      startingAfter: z.string().optional().describe('Cursor for next page (list mode)'),
      paginationCursor: z.string().optional().describe('Cursor for next page (search mode)')
    })
  )
  .output(
    z.object({
      conversations: z
        .array(
          z.object({
            conversationId: z.string().describe('Conversation ID'),
            state: z.string().optional().describe('Conversation state'),
            title: z.string().optional().describe('Conversation title'),
            open: z.boolean().optional().describe('Whether open'),
            read: z.boolean().optional().describe('Whether read'),
            priority: z.string().optional().describe('Priority'),
            assigneeId: z.string().optional().describe('Assignee ID'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('Matching conversations'),
      totalCount: z.number().optional().describe('Total number of matching conversations'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result: any;
    if (ctx.input.mode === 'search' && ctx.input.query) {
      result = await client.searchConversations(
        ctx.input.query,
        ctx.input.paginationCursor,
        ctx.input.perPage
      );
    } else {
      result = await client.listConversations({
        perPage: ctx.input.perPage,
        startingAfter: ctx.input.startingAfter
      });
    }

    let conversations = (result.conversations || result.data || []).map((c: any) => ({
      conversationId: String(c.id),
      state: stringOrUndefined(c.state),
      title: stringOrUndefined(c.title),
      open: booleanOrUndefined(c.open),
      read: booleanOrUndefined(c.read),
      priority: stringOrUndefined(c.priority),
      assigneeId: c.assignee?.id ? String(c.assignee.id) : undefined,
      createdAt: timestampOrUndefined(c.created_at),
      updatedAt: timestampOrUndefined(c.updated_at)
    }));

    return {
      output: {
        conversations,
        totalCount: result.total_count,
        hasMore: !!result.pages?.next
      },
      message: `Found **${result.total_count ?? conversations.length}** conversations (showing ${conversations.length})`
    };
  })
  .build();
