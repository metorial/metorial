import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `List and search conversations in Front. Retrieve conversations with optional filtering by search query, and paginate through results. Use this to find conversations matching specific criteria or to browse recent conversations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter conversations'),
      pageToken: z.string().optional().describe('Pagination token for fetching the next page'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      conversations: z.array(
        z.object({
          conversationId: z.string(),
          subject: z.string(),
          status: z.string(),
          assigneeEmail: z.string().optional(),
          isPrivate: z.boolean(),
          createdAt: z.number(),
          tags: z.array(
            z.object({
              tagId: z.string(),
              name: z.string()
            })
          )
        })
      ),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.query) {
      result = await client.searchConversations(ctx.input.query, {
        page_token: ctx.input.pageToken,
        limit: ctx.input.limit
      });
    } else {
      result = await client.listConversations({
        q: ctx.input.query,
        page_token: ctx.input.pageToken,
        limit: ctx.input.limit,
        sort_by: ctx.input.sortBy,
        sort_order: ctx.input.sortOrder
      });
    }

    let conversations = result._results.map((c: any) => ({
      conversationId: c.id,
      subject: c.subject,
      status: c.status,
      assigneeEmail: c.assignee?.email,
      isPrivate: c.is_private,
      createdAt: c.created_at,
      tags: c.tags.map((t: any) => ({
        tagId: t.id,
        name: t.name
      }))
    }));

    let nextPageToken = result._pagination?.next || undefined;

    return {
      output: { conversations, nextPageToken },
      message: `Found **${conversations.length}** conversations${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.${nextPageToken ? ' More results available.' : ''}`
    };
  });
