import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireAtLeastOneDefined } from '../lib/validation';
import { spec } from '../spec';

export let updateTicket = SlateTool.create(spec, {
  name: 'Update Ticket',
  key: 'update_ticket',
  description: `Update an existing ticket's properties such as status, priority, assignment, category, description, and custom fields.

Priority: 1=Low, 2=Medium, 3=High, 4=Urgent.
Status: 2=Open, 3=Pending, 4=Resolved, 5=Closed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket to update'),
      subject: z.string().optional().describe('Updated subject'),
      description: z.string().optional().describe('Updated HTML description'),
      status: z
        .number()
        .optional()
        .describe('Status: 2=Open, 3=Pending, 4=Resolved, 5=Closed'),
      priority: z.number().optional().describe('Priority: 1=Low, 2=Medium, 3=High, 4=Urgent'),
      source: z.number().optional().describe('Source channel'),
      type: z.string().optional().describe('"Incident" or "Service Request"'),
      groupId: z.number().optional().describe('Assign to agent group'),
      agentId: z.number().optional().describe('Assign to agent'),
      departmentId: z.number().optional().describe('Department ID'),
      category: z.string().optional().describe('Category'),
      subCategory: z.string().optional().describe('Sub-category'),
      itemCategory: z.string().optional().describe('Item category'),
      urgency: z.number().optional().describe('Urgency: 1=Low, 2=Medium, 3=High'),
      impact: z.number().optional().describe('Impact: 1=Low, 2=Medium, 3=High'),
      dueBy: z.string().optional().describe('Due date (ISO 8601)'),
      frDueBy: z.string().optional().describe('First response due date (ISO 8601)'),
      tags: z.array(z.string()).optional().describe('Tags'),
      customFields: z.record(z.string(), z.unknown()).optional().describe('Custom fields')
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
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let { ticketId, ...updateParams } = ctx.input;
    requireAtLeastOneDefined(updateParams, 'Provide at least one field to update a ticket.');

    let ticket = await client.updateTicket(ticketId, updateParams);

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
