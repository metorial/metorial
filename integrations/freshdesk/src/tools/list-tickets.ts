import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let listTickets = SlateTool.create(spec, {
  name: 'List Tickets',
  key: 'list_tickets',
  description: `Lists tickets from Freshdesk with optional filtering, ordering, and pagination. Can filter by updated timestamp and include related data. Returns up to 30 tickets per page.`,
  constraints: [
    'Returns a maximum of 30 tickets per page',
    'Use the page parameter for pagination'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderBy: z
        .enum(['created_at', 'due_by', 'updated_at', 'status'])
        .optional()
        .describe('Field to order results by'),
      orderType: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page (max 30)'),
      updatedSince: z
        .string()
        .optional()
        .describe('Return tickets updated after this ISO 8601 timestamp'),
      include: z
        .string()
        .optional()
        .describe(
          'Include additional data: "requester", "stats", "company", or comma-separated combination'
        )
    })
  )
  .output(
    z.object({
      tickets: z
        .array(
          z.object({
            ticketId: z.number().describe('Ticket ID'),
            subject: z.string().describe('Ticket subject'),
            status: z.number().describe('Ticket status'),
            priority: z.number().describe('Ticket priority'),
            requesterId: z.number().describe('Requester contact ID'),
            responderId: z.number().nullable().describe('Assigned agent ID'),
            groupId: z.number().nullable().describe('Assigned group ID'),
            type: z.string().nullable().describe('Ticket type'),
            tags: z.array(z.string()).describe('Ticket tags'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of tickets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let tickets = await client.listTickets({
      orderBy: ctx.input.orderBy,
      orderType: ctx.input.orderType,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      updatedSince: ctx.input.updatedSince,
      include: ctx.input.include
    });

    let mappedTickets = tickets.map((t: any) => ({
      ticketId: t.id,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      requesterId: t.requester_id,
      responderId: t.responder_id ?? null,
      groupId: t.group_id ?? null,
      type: t.type ?? null,
      tags: t.tags ?? [],
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return {
      output: { tickets: mappedTickets },
      message: `Retrieved **${mappedTickets.length}** tickets`
    };
  })
  .build();
