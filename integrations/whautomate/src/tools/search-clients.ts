import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchClients = SlateTool.create(spec, {
  name: 'Search Clients',
  key: 'search_clients',
  description: `Search and retrieve client records. Supports filtering by free-text search, location, tags, and date range. Use this to find clients or get a specific client by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clientId: z
        .string()
        .optional()
        .describe('Get a specific client by ID. If provided, other filters are ignored.'),
      search: z.string().optional().describe('Free-text search across client fields'),
      locationId: z.string().optional().describe('Filter by location ID'),
      tags: z.string().optional().describe('Filter by tags (comma-separated)'),
      fromDate: z.string().optional().describe('Filter from date (YYYY-MM-DD)'),
      toDate: z.string().optional().describe('Filter to date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      clients: z.array(z.record(z.string(), z.any())).describe('Array of client records'),
      totalCount: z.number().optional().describe('Total number of matching clients')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    if (ctx.input.clientId) {
      let result = await client.getClient(ctx.input.clientId);
      return {
        output: {
          clients: [result],
          totalCount: 1
        },
        message: `Found client **${result.firstName || ''} ${result.lastName || ''}** (${ctx.input.clientId}).`
      };
    }

    let result = await client.searchClients({
      search: ctx.input.search,
      locationId: ctx.input.locationId,
      tags: ctx.input.tags,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let clients = Array.isArray(result) ? result : result.clients || result.data || [];
    let totalCount = result.totalCount || result.total || clients.length;

    return {
      output: {
        clients,
        totalCount
      },
      message: `Found **${totalCount}** client(s).`
    };
  })
  .build();
