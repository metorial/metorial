import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let search = SlateTool.create(spec, {
  name: 'Search',
  key: 'search',
  description: `Search across tickets, contacts, or accounts using keyword-based queries. Specify the module to search within and optional filters. Returns matching records with basic details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z.enum(['tickets', 'contacts', 'accounts']).describe('Module to search within'),
      query: z.string().describe('Search query string'),
      departmentId: z.string().optional().describe('Filter by department ID (tickets only)'),
      status: z.string().optional().describe('Filter by status (tickets only)'),
      assignee: z.string().optional().describe('Filter by assignee (tickets only)'),
      priority: z.string().optional().describe('Filter by priority (tickets only)'),
      channel: z.string().optional().describe('Filter by channel (tickets only)'),
      sortBy: z.string().optional().describe('Field to sort results by'),
      from: z.number().optional().describe('Starting index for pagination'),
      limit: z.number().optional().describe('Number of results to return')
    })
  )
  .output(
    z.object({
      results: z
        .array(z.record(z.string(), z.any()))
        .describe('Search results - fields vary by module'),
      count: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let rawResults: any;

    if (ctx.input.module === 'tickets') {
      rawResults = await client.searchTickets({
        searchStr: ctx.input.query,
        departmentId: ctx.input.departmentId,
        status: ctx.input.status,
        assignee: ctx.input.assignee,
        priority: ctx.input.priority,
        channel: ctx.input.channel,
        sortBy: ctx.input.sortBy,
        from: ctx.input.from,
        limit: ctx.input.limit
      });
    } else if (ctx.input.module === 'contacts') {
      rawResults = await client.searchContacts({
        searchStr: ctx.input.query,
        sortBy: ctx.input.sortBy,
        from: ctx.input.from,
        limit: ctx.input.limit
      });
    } else {
      rawResults = await client.searchAccounts({
        searchStr: ctx.input.query,
        sortBy: ctx.input.sortBy,
        from: ctx.input.from,
        limit: ctx.input.limit
      });
    }

    let data = Array.isArray(rawResults) ? rawResults : rawResults?.data || [];

    return {
      output: {
        results: data,
        count: data.length
      },
      message: `Found **${data.length}** result(s) in **${ctx.input.module}** for "${ctx.input.query}"`
    };
  })
  .build();
