import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listTickets = SlateTool.create(spec, {
  name: 'List Tickets',
  key: 'list_tickets',
  description: `List support tickets with optional filtering by department, assignee, status, and sorting. Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      departmentId: z.string().optional().describe('Filter by department ID'),
      assignee: z.string().optional().describe('Filter by assignee agent ID'),
      status: z.string().optional().describe('Filter by status (e.g., Open, Closed)'),
      sortBy: z
        .string()
        .optional()
        .describe('Field to sort by (e.g., modifiedTime, createdTime, dueDate)'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      include: z
        .string()
        .optional()
        .describe(
          'Comma-separated related data to include (e.g., "contacts,assignee,departments")'
        ),
      from: z.number().optional().describe('Starting index for pagination (0-based)'),
      limit: z
        .number()
        .optional()
        .describe('Number of tickets to return (max 100, default 10)')
    })
  )
  .output(
    z.object({
      tickets: z
        .array(
          z.object({
            ticketId: z.string().describe('Ticket ID'),
            ticketNumber: z.string().optional().describe('Ticket number'),
            subject: z.string().optional().describe('Subject'),
            status: z.string().optional().describe('Status'),
            priority: z.string().optional().describe('Priority'),
            assigneeId: z.string().optional().describe('Assigned agent ID'),
            contactId: z.string().optional().describe('Contact ID'),
            departmentId: z.string().optional().describe('Department ID'),
            createdTime: z.string().optional().describe('Created time'),
            modifiedTime: z.string().optional().describe('Modified time'),
            dueDate: z.string().optional().describe('Due date')
          })
        )
        .describe('List of tickets')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listTickets({
      departmentId: ctx.input.departmentId,
      assignee: ctx.input.assignee,
      status: ctx.input.status,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      include: ctx.input.include,
      from: ctx.input.from,
      limit: ctx.input.limit
    });

    let data = Array.isArray(result) ? result : result?.data || [];

    let tickets = data.map((t: any) => ({
      ticketId: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      assigneeId: t.assigneeId,
      contactId: t.contactId,
      departmentId: t.departmentId,
      createdTime: t.createdTime,
      modifiedTime: t.modifiedTime,
      dueDate: t.dueDate
    }));

    return {
      output: { tickets },
      message: `Found **${tickets.length}** ticket(s)`
    };
  })
  .build();
