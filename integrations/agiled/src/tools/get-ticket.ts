import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTicket = SlateTool.create(spec, {
  name: 'Get Ticket',
  key: 'get_ticket',
  description: `Retrieve a support ticket by ID, or list tickets with pagination. Returns ticket details including subject, status, priority, and assignee.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z
        .string()
        .optional()
        .describe('ID of a specific ticket to retrieve. If omitted, lists tickets.'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of tickets per page')
    })
  )
  .output(
    z.object({
      tickets: z.array(z.record(z.string(), z.unknown())).describe('Array of ticket records'),
      totalCount: z.number().optional().describe('Total number of tickets'),
      currentPage: z.number().optional().describe('Current page number'),
      lastPage: z.number().optional().describe('Last page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    if (ctx.input.ticketId) {
      let result = await client.getTicket(ctx.input.ticketId);
      return {
        output: { tickets: [result.data] },
        message: `Retrieved ticket **${result.data.subject ?? ctx.input.ticketId}**.`
      };
    }

    let result = await client.listTickets(ctx.input.page, ctx.input.perPage);

    return {
      output: {
        tickets: result.data,
        totalCount: result.meta?.total,
        currentPage: result.meta?.current_page,
        lastPage: result.meta?.last_page
      },
      message: `Retrieved ${result.data.length} ticket(s)${result.meta ? ` (page ${result.meta.current_page} of ${result.meta.last_page})` : ''}.`
    };
  })
  .build();
