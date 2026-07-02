import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlatformClient } from '../lib/client';
import { spec } from '../spec';

export let listTicketsTool = SlateTool.create(spec, {
  name: 'List Tickets',
  key: 'list_tickets',
  description: `Retrieve a paginated list of support tickets from your Landbot account.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Number of records to skip for pagination'),
      limit: z.number().optional().describe('Maximum number of records to return')
    })
  )
  .output(
    z.object({
      tickets: z.array(z.record(z.string(), z.any())).describe('List of ticket records'),
      count: z.number().optional().describe('Total number of tickets available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlatformClient(ctx.auth.token);
    let result = await client.listTickets({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });
    let tickets = result.results ?? result.tickets ?? (Array.isArray(result) ? result : []);
    let count = result.count ?? tickets.length;

    return {
      output: { tickets, count },
      message: `Retrieved **${tickets.length}** tickets${count ? ` out of ${count} total` : ''}.`
    };
  });

export let getTicketTool = SlateTool.create(spec, {
  name: 'Get Ticket',
  key: 'get_ticket',
  description: `Retrieve detailed information about a specific support ticket by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('Numeric ID of the ticket')
    })
  )
  .output(
    z.object({
      ticket: z.record(z.string(), z.any()).describe('Ticket record with details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlatformClient(ctx.auth.token);
    let ticket = await client.getTicket(ctx.input.ticketId);

    return {
      output: { ticket },
      message: `Retrieved ticket **#${ctx.input.ticketId}**.`
    };
  });

export let createTicketTool = SlateTool.create(spec, {
  name: 'Create Ticket',
  key: 'create_ticket',
  description: `Create a new support ticket in Landbot for tracking customer interactions.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z.number().optional().describe('Customer ID to associate with the ticket'),
      title: z.string().optional().describe('Title or subject of the ticket'),
      description: z.string().optional().describe('Detailed description of the ticket'),
      extra: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional fields to include in the ticket')
    })
  )
  .output(
    z.object({
      ticket: z.record(z.string(), z.any()).describe('The newly created ticket record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlatformClient(ctx.auth.token);

    let data: Record<string, any> = {};
    if (ctx.input.customerId !== undefined) data.customer = ctx.input.customerId;
    if (ctx.input.title !== undefined) data.title = ctx.input.title;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.extra) {
      Object.assign(data, ctx.input.extra);
    }

    let ticket = await client.createTicket(data);

    return {
      output: { ticket },
      message: `Created ticket${ctx.input.title ? ` "${ctx.input.title}"` : ''}.`
    };
  });

export let updateTicketTool = SlateTool.create(spec, {
  name: 'Update Ticket',
  key: 'update_ticket',
  description: `Update an existing support ticket's properties.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('Numeric ID of the ticket to update'),
      title: z.string().optional().describe('Updated title of the ticket'),
      description: z.string().optional().describe('Updated description of the ticket'),
      status: z.string().optional().describe('Updated status of the ticket'),
      extra: z.record(z.string(), z.any()).optional().describe('Additional fields to update')
    })
  )
  .output(
    z.object({
      ticket: z.record(z.string(), z.any()).describe('The updated ticket record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlatformClient(ctx.auth.token);

    let data: Record<string, any> = {};
    if (ctx.input.title !== undefined) data.title = ctx.input.title;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.status !== undefined) data.status = ctx.input.status;
    if (ctx.input.extra) {
      Object.assign(data, ctx.input.extra);
    }

    let ticket = await client.updateTicket(ctx.input.ticketId, data);

    return {
      output: { ticket },
      message: `Updated ticket **#${ctx.input.ticketId}**.`
    };
  });
