import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listTickets = SlateTool.create(spec, {
  name: 'List Tickets',
  key: 'list_tickets',
  description: `Retrieve a paginated list of support tickets. Can filter by status, assignee, or customer. Use cursor-based pagination to iterate through results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z.number().optional().describe('Number of tickets to return (default 30)'),
      customerId: z.number().optional().describe('Filter by customer ID'),
      assigneeUserId: z.number().optional().describe('Filter by assigned agent user ID'),
      assigneeTeamId: z.number().optional().describe('Filter by assigned team ID'),
      status: z.enum(['open', 'closed']).optional().describe('Filter by ticket status')
    })
  )
  .output(
    z.object({
      tickets: z.array(
        z.object({
          ticketId: z.number().describe('Ticket ID'),
          status: z.string().describe('Ticket status'),
          channel: z.string().nullable().describe('Channel the ticket originated from'),
          subject: z.string().nullable().describe('Ticket subject'),
          priority: z.string().nullable().describe('Ticket priority'),
          customerEmail: z.string().nullable().describe('Customer email'),
          assigneeUserName: z.string().nullable().describe('Assigned agent name'),
          tags: z.array(z.string()).describe('Tag names on the ticket'),
          createdDatetime: z.string().nullable().describe('When the ticket was created'),
          updatedDatetime: z.string().nullable().describe('When the ticket was last updated')
        })
      ),
      nextCursor: z.string().nullable().describe('Cursor for the next page'),
      prevCursor: z.string().nullable().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let result = await client.listTickets({
      cursor: ctx.input.cursor,
      limit: ctx.input.limit,
      customer_id: ctx.input.customerId,
      assignee_user_id: ctx.input.assigneeUserId,
      assignee_team_id: ctx.input.assigneeTeamId,
      status: ctx.input.status
    });

    let tickets = result.data.map((t: any) => ({
      ticketId: t.id,
      status: t.status,
      channel: t.channel || null,
      subject: t.subject || null,
      priority: t.priority || null,
      customerEmail: t.customer?.email || null,
      assigneeUserName: t.assignee_user
        ? [t.assignee_user.firstname, t.assignee_user.lastname].filter(Boolean).join(' ') ||
          null
        : null,
      tags: (t.tags || []).map((tag: any) => tag.name),
      createdDatetime: t.created_datetime || null,
      updatedDatetime: t.updated_datetime || null
    }));

    return {
      output: {
        tickets,
        nextCursor: result.meta.next_cursor,
        prevCursor: result.meta.prev_cursor
      },
      message: `Found **${tickets.length}** ticket(s).${result.meta.next_cursor ? ' More results available with the next cursor.' : ''}`
    };
  })
  .build();
