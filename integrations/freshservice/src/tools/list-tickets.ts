import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTickets = SlateTool.create(spec, {
  name: 'List Tickets',
  key: 'list_tickets',
  description: `List and filter tickets from Freshservice. Supports predefined filters, pagination, ordering, and filtering by update time. Use **searchTickets** for query-based searches with custom conditions.`,
  instructions: [
    'Use the "filter" param for predefined filters like "new_and_my_open", "watching", "spam", "deleted".',
    'Use "updatedSince" to get tickets modified after a specific date.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe('Predefined filter: new_and_my_open, watching, spam, deleted'),
      orderBy: z
        .string()
        .optional()
        .describe('Field to order by: created_at, due_by, updated_at, status'),
      orderType: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      updatedSince: z
        .string()
        .optional()
        .describe('Only return tickets updated since this date (ISO 8601)'),
      include: z
        .string()
        .optional()
        .describe('Comma-separated embedded resources: requester, stats, tags'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 30, max: 100)')
    })
  )
  .output(
    z.object({
      tickets: z
        .array(
          z.object({
            ticketId: z.number().describe('ID of the ticket'),
            subject: z.string().describe('Subject of the ticket'),
            status: z.number().describe('Status'),
            priority: z.number().describe('Priority'),
            type: z.string().nullable().describe('Type'),
            requesterId: z.number().describe('Requester ID'),
            agentId: z.number().nullable().describe('Assigned agent ID'),
            groupId: z.number().nullable().describe('Assigned group ID'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of tickets'),
      total: z.string().optional().describe('Total number of tickets matching the filter')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let result = await client.listTickets(
      { page: ctx.input.page, perPage: ctx.input.perPage },
      ctx.input.filter,
      ctx.input.orderBy,
      ctx.input.orderType,
      ctx.input.include,
      ctx.input.updatedSince
    );

    let tickets = result.tickets.map((t: Record<string, unknown>) => ({
      ticketId: t.id as number,
      subject: t.subject as string,
      status: t.status as number,
      priority: t.priority as number,
      type: t.type as string | null,
      requesterId: t.requester_id as number,
      agentId: t.responder_id as number | null,
      groupId: t.group_id as number | null,
      createdAt: t.created_at as string,
      updatedAt: t.updated_at as string
    }));

    return {
      output: { tickets, total: result.total },
      message: `Found **${tickets.length}** tickets${result.total ? ` (total: ${result.total})` : ''}`
    };
  })
  .build();
