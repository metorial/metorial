import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

export let search = SlateTool.create(spec, {
  name: 'Search',
  key: 'search',
  description: `Performs a full-text search across Zendesk resources including tickets, users, organizations, and articles. Supports the Zendesk search query syntax with field filters, tags, dates, and boolean operators.`,
  instructions: [
    'Use Zendesk search syntax: e.g., `type:ticket status:open priority:high`',
    'Combine with text search: `type:ticket "login issue" status:pending`',
    'Filter by date: `type:ticket created>2024-01-01`',
    'Filter by tags: `type:ticket tags:vip`',
    'Search users: `type:user role:agent`',
    'Search organizations: `type:organization "Acme Corp"`'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The Zendesk search query string'),
      page: z.number().optional().default(1).describe('Page number for pagination'),
      perPage: z
        .number()
        .optional()
        .default(25)
        .describe('Number of results per page (max 100)'),
      sortBy: z
        .enum(['updated_at', 'created_at', 'priority', 'status', 'ticket_type'])
        .optional()
        .describe('Field to sort results by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          resultType: z
            .string()
            .describe('The type of result (ticket, user, organization, etc.)'),
          resultId: z.string().describe('The ID of the result'),
          name: z.string().nullable().describe('Name or subject of the result'),
          url: z.string().nullable().describe('API URL of the result'),
          createdAt: z.string().nullable().describe('When the result was created'),
          updatedAt: z.string().nullable().describe('When the result was last updated')
        })
      ),
      count: z.number().describe('Total number of matching results'),
      nextPage: z.string().nullable().describe('URL of the next page, if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let data = await client.search(ctx.input.query, {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder
    });

    let results = (data.results || []).map((r: any) => ({
      resultType: r.result_type || 'unknown',
      resultId: String(r.id),
      name: r.subject || r.name || r.title || null,
      url: r.url || null,
      createdAt: r.created_at || null,
      updatedAt: r.updated_at || null
    }));

    return {
      output: {
        results,
        count: data.count || results.length,
        nextPage: data.next_page || null
      },
      message: `Found ${data.count || results.length} result(s) for query: "${ctx.input.query}"`
    };
  })
  .build();
