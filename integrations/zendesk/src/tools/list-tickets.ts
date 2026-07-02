import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

export let listTickets = SlateTool.create(spec, {
  name: 'List Tickets',
  key: 'list_tickets',
  description: `Lists support tickets from the Zendesk account. Returns tickets sorted by ID by default. For filtered or complex queries, use the **Search** tool instead.`,
  constraints: ['Returns up to 100 tickets per page', 'Archived tickets are not included'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number for pagination'),
      perPage: z
        .number()
        .optional()
        .default(25)
        .describe('Number of tickets per page (max 100)'),
      sortBy: z
        .enum([
          'assignee',
          'assignee.name',
          'created_at',
          'group',
          'id',
          'locale',
          'requester',
          'requester.name',
          'status',
          'subject',
          'updated_at'
        ])
        .optional()
        .describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      tickets: z.array(
        z.object({
          ticketId: z.string(),
          subject: z.string().nullable(),
          status: z.string(),
          priority: z.string().nullable(),
          type: z.string().nullable(),
          requesterId: z.string().nullable(),
          assigneeId: z.string().nullable(),
          groupId: z.string().nullable(),
          tags: z.array(z.string()),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      count: z.number().describe('Total number of tickets'),
      nextPage: z.string().nullable().describe('URL of the next page, if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let data = await client.listTickets({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder
    });

    let tickets = (data.tickets || []).map((t: any) => ({
      ticketId: String(t.id),
      subject: t.subject || null,
      status: t.status,
      priority: t.priority || null,
      type: t.type || null,
      requesterId: t.requester_id ? String(t.requester_id) : null,
      assigneeId: t.assignee_id ? String(t.assignee_id) : null,
      groupId: t.group_id ? String(t.group_id) : null,
      tags: t.tags || [],
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return {
      output: {
        tickets,
        count: data.count || tickets.length,
        nextPage: data.next_page || null
      },
      message: `Found ${data.count || tickets.length} ticket(s), showing ${tickets.length} on this page.`
    };
  })
  .build();
