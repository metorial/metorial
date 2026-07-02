import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let searchGorgias = SlateTool.create(spec, {
  name: 'Search',
  key: 'search',
  description: `Search across tickets, customers, and other resources using a unified search interface. Returns matching results with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      type: z
        .enum(['ticket', 'customer'])
        .optional()
        .describe('Limit search to a specific resource type'),
      limit: z.number().optional().describe('Maximum number of results'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          resourceType: z.string().describe('Type of the result (ticket, customer, etc.)'),
          resourceId: z.number().describe('ID of the matched resource'),
          title: z.string().nullable().describe('Result title or subject'),
          excerpt: z.string().nullable().describe('Matched text excerpt')
        })
      ),
      nextCursor: z.string().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let searchResult = await client.search(ctx.input.query, {
      type: ctx.input.type,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let results = (searchResult.data || []).map((r: any) => ({
      resourceType: r.type || r.object || 'unknown',
      resourceId: r.id,
      title: r.subject || r.name || r.email || null,
      excerpt: r.excerpt || r.body_text || null
    }));

    return {
      output: {
        results,
        nextCursor: searchResult.meta?.next_cursor || null
      },
      message: `Found **${results.length}** result(s) for "${ctx.input.query}".`
    };
  })
  .build();
