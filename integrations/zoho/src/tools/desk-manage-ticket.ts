import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoDeskClient } from '../lib/client';
import { zohoServiceError } from '../lib/errors';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

export let deskManageTicket = SlateTool.create(spec, {
  name: 'Desk Manage Ticket',
  key: 'desk_manage_ticket',
  description: `Create, update, or delete support tickets in Zoho Desk. Supports setting subject, description, priority, status, assignee, department, and custom fields.`,
  instructions: [
    'The orgId parameter is required for all Zoho Desk operations.',
    'For create, provide subject and optionally departmentId, contactId, description, priority, status, etc.',
    'For update, provide ticketId and the fields to change.',
    'For delete, provide ticketId.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orgId: z.string().describe('Zoho Desk organization ID'),
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      ticketId: z.string().optional().describe('Ticket ID (required for update and delete)'),
      subject: z.string().optional().describe('Ticket subject (required for create)'),
      description: z.string().optional().describe('Ticket description/content'),
      departmentId: z.string().optional().describe('Department ID to assign the ticket to'),
      contactId: z.string().optional().describe('Contact ID associated with the ticket'),
      email: z.string().optional().describe('Email of the requester'),
      priority: z
        .string()
        .optional()
        .describe('Ticket priority (e.g., "High", "Medium", "Low")'),
      status: z
        .string()
        .optional()
        .describe('Ticket status (e.g., "Open", "On Hold", "Escalated", "Closed")'),
      assigneeId: z.string().optional().describe('Agent ID to assign the ticket to'),
      category: z.string().optional().describe('Ticket category'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values as key-value pairs')
    })
  )
  .output(
    z.object({
      ticketId: z.string().optional(),
      ticketNumber: z.string().optional(),
      subject: z.string().optional(),
      status: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let dc = (ctx.auth.datacenter || ctx.config.datacenter || 'us') as Datacenter;
    let client = new ZohoDeskClient({
      token: ctx.auth.token,
      datacenter: dc,
      orgId: ctx.input.orgId
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.subject) throw zohoServiceError('subject is required for create');
      let data: Record<string, any> = {};
      if (ctx.input.subject) data.subject = ctx.input.subject;
      if (ctx.input.description) data.description = ctx.input.description;
      if (ctx.input.departmentId) data.departmentId = ctx.input.departmentId;
      if (ctx.input.contactId) data.contactId = ctx.input.contactId;
      if (ctx.input.email) data.email = ctx.input.email;
      if (ctx.input.priority) data.priority = ctx.input.priority;
      if (ctx.input.status) data.status = ctx.input.status;
      if (ctx.input.assigneeId) data.assigneeId = ctx.input.assigneeId;
      if (ctx.input.category) data.category = ctx.input.category;
      if (ctx.input.customFields) data.cf = ctx.input.customFields;

      let result = await client.createTicket(data);
      return {
        output: {
          ticketId: result?.id,
          ticketNumber: result?.ticketNumber,
          subject: result?.subject,
          status: result?.status
        },
        message: `Created ticket **#${result?.ticketNumber}**: "${result?.subject}".`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.ticketId) throw zohoServiceError('ticketId is required for update');
      let data: Record<string, any> = {};
      if (ctx.input.subject) data.subject = ctx.input.subject;
      if (ctx.input.description) data.description = ctx.input.description;
      if (ctx.input.departmentId) data.departmentId = ctx.input.departmentId;
      if (ctx.input.priority) data.priority = ctx.input.priority;
      if (ctx.input.status) data.status = ctx.input.status;
      if (ctx.input.assigneeId) data.assigneeId = ctx.input.assigneeId;
      if (ctx.input.category) data.category = ctx.input.category;
      if (ctx.input.customFields) data.cf = ctx.input.customFields;

      let result = await client.updateTicket(ctx.input.ticketId, data);
      return {
        output: {
          ticketId: result?.id,
          ticketNumber: result?.ticketNumber,
          subject: result?.subject,
          status: result?.status
        },
        message: `Updated ticket **${ctx.input.ticketId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.ticketId) throw zohoServiceError('ticketId is required for delete');
      await client.deleteTicket(ctx.input.ticketId);
      return {
        output: { ticketId: ctx.input.ticketId, deleted: true },
        message: `Deleted ticket **${ctx.input.ticketId}**.`
      };
    }

    throw zohoServiceError('Invalid Desk ticket action.');
  })
  .build();
