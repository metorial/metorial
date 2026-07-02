import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ticketSchema = z.object({
  ticketId: z.number().describe('Ticket ID'),
  number: z.string().optional().describe('Ticket number'),
  subject: z.string().optional().describe('Ticket subject'),
  description: z.string().optional().describe('Problem description'),
  status: z.string().optional().describe('Ticket status'),
  priority: z.string().optional().describe('Priority level'),
  customerId: z.number().optional().describe('Associated customer ID'),
  customerName: z.string().optional().describe('Associated customer name'),
  assignedTo: z.string().optional().describe('Assigned technician'),
  ticketType: z.string().optional().describe('Ticket type'),
  dueDate: z.string().optional().describe('Due date'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

let commentSchema = z.object({
  commentId: z.number().describe('Comment ID'),
  body: z.string().optional().describe('Comment body'),
  subject: z.string().optional().describe('Comment subject'),
  hidden: z.boolean().optional().describe('Whether comment is hidden from customer'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

let mapTicket = (t: any) => ({
  ticketId: t.id,
  number: t.number?.toString(),
  subject: t.subject,
  description: t.description,
  status: t.status,
  priority: t.priority,
  customerId: t.customer_id,
  customerName: t.customer_business_then_name || t.customer?.fullname,
  assignedTo: t.assigned_to,
  ticketType: t.ticket_type,
  dueDate: t.due_date,
  createdAt: t.created_at,
  updatedAt: t.updated_at
});

export let searchTickets = SlateTool.create(spec, {
  name: 'Search Tickets',
  key: 'search_tickets',
  description: `Search and list service tickets (work orders/jobs). Filter by status, customer, assigned technician, date range, or general search query.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('General search query'),
      status: z
        .string()
        .optional()
        .describe('Filter by status (e.g. "new", "in progress", "resolved")'),
      customerId: z.number().optional().describe('Filter by customer ID'),
      assignedTo: z.number().optional().describe('Filter by assigned technician user ID'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter tickets created before this date (YYYY-MM-DD)'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter tickets created after this date (YYYY-MM-DD)'),
      sort: z.string().optional().describe('Sort order'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      tickets: z.array(ticketSchema),
      totalPages: z.number().optional(),
      totalEntries: z.number().optional(),
      page: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.listTickets(ctx.input);
    let tickets = (result.tickets || []).map(mapTicket);

    return {
      output: {
        tickets,
        totalPages: result.meta?.total_pages,
        totalEntries: result.meta?.total_entries,
        page: result.meta?.page
      },
      message: `Found **${tickets.length}** ticket(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();

export let getTicket = SlateTool.create(spec, {
  name: 'Get Ticket',
  key: 'get_ticket',
  description: `Retrieve detailed information about a specific ticket including its status, assignments, and description.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('The ticket ID to retrieve')
    })
  )
  .output(ticketSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.getTicket(ctx.input.ticketId);
    let t = result.ticket || result;

    return {
      output: mapTicket(t),
      message: `Retrieved ticket **#${t.number || t.id}**: ${t.subject || 'No subject'}.`
    };
  })
  .build();

export let createTicket = SlateTool.create(spec, {
  name: 'Create Ticket',
  key: 'create_ticket',
  description: `Create a new service ticket (work order) in RepairShopr. Requires a customer ID and subject at minimum.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z.number().describe('Customer ID to associate the ticket with'),
      subject: z.string().describe('Ticket subject/title'),
      description: z.string().optional().describe('Detailed problem description'),
      status: z.string().optional().describe('Initial status (e.g. "new", "in progress")'),
      priority: z.string().optional().describe('Priority level'),
      assignedTo: z.number().optional().describe('User ID of the technician to assign'),
      ticketType: z.string().optional().describe('Ticket type'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)')
    })
  )
  .output(ticketSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.createTicket(ctx.input);
    let t = result.ticket || result;

    return {
      output: mapTicket(t),
      message: `Created ticket **#${t.number || t.id}**: ${t.subject}.`
    };
  })
  .build();

export let updateTicket = SlateTool.create(spec, {
  name: 'Update Ticket',
  key: 'update_ticket',
  description: `Update an existing ticket's subject, description, status, priority, assignment, or other fields. Only provided fields are modified.`
})
  .input(
    z.object({
      ticketId: z.number().describe('The ticket ID to update'),
      subject: z.string().optional().describe('New subject/title'),
      description: z.string().optional().describe('New problem description'),
      status: z.string().optional().describe('New status'),
      priority: z.string().optional().describe('New priority'),
      assignedTo: z.number().optional().describe('User ID of the technician to assign'),
      ticketType: z.string().optional().describe('New ticket type'),
      dueDate: z.string().optional().describe('New due date (YYYY-MM-DD)')
    })
  )
  .output(ticketSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let { ticketId, ...updateData } = ctx.input;
    let result = await client.updateTicket(ticketId, updateData);
    let t = result.ticket || result;

    return {
      output: mapTicket(t),
      message: `Updated ticket **#${t.number || t.id}**${ctx.input.status ? ` (status → "${ctx.input.status}")` : ''}.`
    };
  })
  .build();

export let deleteTicket = SlateTool.create(spec, {
  name: 'Delete Ticket',
  key: 'delete_ticket',
  description: `Permanently delete a ticket. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('The ticket ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    await client.deleteTicket(ctx.input.ticketId);

    return {
      output: { success: true },
      message: `Deleted ticket **${ctx.input.ticketId}**.`
    };
  })
  .build();

export let addTicketComment = SlateTool.create(spec, {
  name: 'Add Ticket Comment',
  key: 'add_ticket_comment',
  description: `Add a comment to an existing ticket. Comments can be visible to the customer or hidden as internal notes. By default, a notification email is sent to the customer.`,
  instructions: [
    'Set hidden to true for internal technician notes that should not be visible to the customer.',
    'Set doNotEmail to true to prevent the customer from being notified.'
  ]
})
  .input(
    z.object({
      ticketId: z.number().describe('The ticket ID to add a comment to'),
      body: z.string().describe('Comment body text'),
      subject: z.string().optional().describe('Comment subject line'),
      hidden: z.boolean().optional().describe('If true, comment is hidden from the customer'),
      doNotEmail: z
        .boolean()
        .optional()
        .describe('If true, do not email the customer about this comment')
    })
  )
  .output(commentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.createTicketComment(ctx.input.ticketId, {
      body: ctx.input.body,
      doNotEmail: ctx.input.doNotEmail,
      hidden: ctx.input.hidden,
      subject: ctx.input.subject
    });
    let c = result.comment || result;

    return {
      output: {
        commentId: c.id,
        body: c.body,
        subject: c.subject,
        hidden: c.hidden,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      },
      message: `Added ${ctx.input.hidden ? 'hidden ' : ''}comment to ticket **${ctx.input.ticketId}**.`
    };
  })
  .build();

export let listTicketComments = SlateTool.create(spec, {
  name: 'List Ticket Comments',
  key: 'list_ticket_comments',
  description: `List all comments on a specific ticket, including customer-visible and internal notes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('The ticket ID to list comments for'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      comments: z.array(commentSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.listTicketComments(ctx.input.ticketId, ctx.input.page);
    let comments = (result.comments || []).map((c: any) => ({
      commentId: c.id,
      body: c.body,
      subject: c.subject,
      hidden: c.hidden,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: { comments },
      message: `Found **${comments.length}** comment(s) on ticket **${ctx.input.ticketId}**.`
    };
  })
  .build();
