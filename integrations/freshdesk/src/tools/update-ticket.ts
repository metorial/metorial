import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let updateTicket = SlateTool.create(spec, {
  name: 'Update Ticket',
  key: 'update_ticket',
  description: `Updates an existing ticket's properties such as status, priority, assignee, subject, tags, type, and custom fields. Only provide the fields you want to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket to update'),
      subject: z.string().optional().describe('New subject'),
      description: z.string().optional().describe('New HTML description'),
      status: z
        .number()
        .optional()
        .describe('New status: 2=Open, 3=Pending, 4=Resolved, 5=Closed'),
      priority: z
        .number()
        .optional()
        .describe('New priority: 1=Low, 2=Medium, 3=High, 4=Urgent'),
      source: z.number().optional().describe('New source channel'),
      type: z.string().optional().describe('New ticket type'),
      groupId: z.number().optional().describe('New group assignment'),
      responderId: z.number().optional().describe('New agent assignment'),
      tags: z.array(z.string()).optional().describe('Updated tags (replaces existing)'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field key-value pairs to update')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('ID of the updated ticket'),
      subject: z.string().describe('Updated subject'),
      status: z.number().describe('Updated status'),
      priority: z.number().describe('Updated priority'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let updateData: Record<string, any> = {};

    if (ctx.input.subject !== undefined) updateData.subject = ctx.input.subject;
    if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
    if (ctx.input.status !== undefined) updateData.status = ctx.input.status;
    if (ctx.input.priority !== undefined) updateData.priority = ctx.input.priority;
    if (ctx.input.source !== undefined) updateData.source = ctx.input.source;
    if (ctx.input.type !== undefined) updateData.type = ctx.input.type;
    if (ctx.input.groupId !== undefined) updateData.group_id = ctx.input.groupId;
    if (ctx.input.responderId !== undefined) updateData.responder_id = ctx.input.responderId;
    if (ctx.input.tags !== undefined) updateData.tags = ctx.input.tags;
    if (ctx.input.customFields !== undefined)
      updateData.custom_fields = ctx.input.customFields;

    let ticket = await client.updateTicket(ctx.input.ticketId, updateData);

    return {
      output: {
        ticketId: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        updatedAt: ticket.updated_at
      },
      message: `Updated ticket **#${ticket.id}**: "${ticket.subject}"`
    };
  })
  .build();
