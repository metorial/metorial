import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateTicket = SlateTool.create(spec, {
  name: 'Update Ticket',
  key: 'update_ticket',
  description: `Update an existing support ticket. Change subject, description, status, priority, assignee, due date, category, and custom fields. Can also move a ticket to a different department or merge tickets.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('ID of the ticket to update'),
      subject: z.string().optional().describe('Updated subject'),
      description: z.string().optional().describe('Updated description (HTML supported)'),
      priority: z
        .string()
        .optional()
        .describe('Updated priority (e.g., Low, Medium, High, Urgent)'),
      status: z
        .string()
        .optional()
        .describe('Updated status (e.g., Open, On Hold, Escalated, Closed)'),
      assigneeId: z.string().optional().describe('Agent ID to reassign to'),
      teamId: z.string().optional().describe('Team ID to reassign to'),
      category: z.string().optional().describe('Updated category'),
      subCategory: z.string().optional().describe('Updated sub-category'),
      dueDate: z.string().optional().describe('Updated due date in ISO format'),
      productId: z.string().optional().describe('Updated product ID'),
      moveToDepartmentId: z
        .string()
        .optional()
        .describe('Department ID to move the ticket to (triggers a move operation)'),
      mergeWithTicketIds: z
        .array(z.string())
        .optional()
        .describe('List of ticket IDs to merge into this ticket'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values to update')
    })
  )
  .output(
    z.object({
      ticketId: z.string().describe('ID of the updated ticket'),
      ticketNumber: z.string().optional().describe('Ticket number'),
      subject: z.string().optional().describe('Subject of the updated ticket'),
      status: z.string().optional().describe('Status after update')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { ticketId, moveToDepartmentId, mergeWithTicketIds, customFields, ...updateFields } =
      ctx.input;

    let updateData: Record<string, any> = {};
    for (let [key, value] of Object.entries(updateFields)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    if (customFields) {
      updateData.cf = customFields;
    }

    let result: any;

    if (Object.keys(updateData).length > 0) {
      result = await client.updateTicket(ticketId, updateData);
    } else {
      result = await client.getTicket(ticketId);
    }

    if (moveToDepartmentId) {
      await client.moveTicket(ticketId, moveToDepartmentId);
      ctx.info(`Moved ticket to department ${moveToDepartmentId}`);
    }

    if (mergeWithTicketIds && mergeWithTicketIds.length > 0) {
      await client.mergeTickets(ticketId, mergeWithTicketIds);
      ctx.info(`Merged ${mergeWithTicketIds.length} ticket(s) into ticket ${ticketId}`);
    }

    return {
      output: {
        ticketId: result.id,
        ticketNumber: result.ticketNumber,
        subject: result.subject,
        status: result.status
      },
      message: `Updated ticket **#${result.ticketNumber || result.id}**: "${result.subject}"`
    };
  })
  .build();
