import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { ticketSchema } from '../lib/types';
import { spec } from '../spec';

export let searchTickets = SlateTool.create(spec, {
  name: 'Search Tickets',
  key: 'search_tickets',
  description: `Search for tickets using a text query. Searches across ticket subject, content, and other fields. Returns matching tickets with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (1 to 99, default 15)'),
      page: z.number().optional().describe('Page number (default 1)'),
      spam: z.boolean().optional().describe('Include tickets marked as spam'),
      trash: z.boolean().optional().describe('Include trashed tickets')
    })
  )
  .output(
    z.object({
      tickets: z.array(ticketSchema).describe('Tickets matching the search query'),
      total: z.number().describe('Total number of matching tickets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companySubdomain: ctx.config.companySubdomain
    });

    let result = await client.searchTickets(ctx.input.query, {
      perPage: ctx.input.perPage,
      page: ctx.input.page,
      spam: ctx.input.spam,
      trash: ctx.input.trash
    });

    return {
      output: result,
      message: `Found **${result.total}** tickets matching "${ctx.input.query}". Returned **${result.tickets.length}** results.`
    };
  })
  .build();
