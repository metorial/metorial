import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let searchTickets = SlateTool.create(spec, {
  name: 'Search Tickets',
  key: 'search_tickets',
  description: `Searches tickets using Freshdesk's filter query language. Supports filtering by standard and custom fields with logical operators.
Example queries: \`"status:2 AND priority:4"\`, \`"agent_id:123 AND created_at:>'2024-01-01'"\`, \`"tag:'billing' AND status:2"\`.`,
  instructions: [
    'Query uses Freshdesk filter syntax with field:value pairs joined by AND/OR',
    'String values must be wrapped in single quotes within the query',
    "Date values use ISO format with comparison operators: created_at:>'2024-01-01'"
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Freshdesk filter query string (e.g., "status:2 AND priority:3")'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching tickets'),
      tickets: z
        .array(
          z.object({
            ticketId: z.number().describe('Ticket ID'),
            subject: z.string().describe('Ticket subject'),
            status: z.number().describe('Ticket status'),
            priority: z.number().describe('Ticket priority'),
            requesterId: z.number().describe('Requester contact ID'),
            responderId: z.number().nullable().describe('Assigned agent ID'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('Matching tickets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let result = await client.filterTickets(ctx.input.query, ctx.input.page);

    let tickets = (result.results ?? []).map((t: any) => ({
      ticketId: t.id,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      requesterId: t.requester_id,
      responderId: t.responder_id ?? null,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return {
      output: {
        total: result.total ?? tickets.length,
        tickets
      },
      message: `Found **${result.total ?? tickets.length}** tickets matching the query`
    };
  })
  .build();
