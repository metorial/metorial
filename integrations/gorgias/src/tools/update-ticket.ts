import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateTicket = SlateTool.create(spec, {
  name: 'Update Ticket',
  key: 'update_ticket',
  description: `Update an existing support ticket. Can change status, priority, assignee, tags, subject, custom fields, and more. Only provide the fields you want to change.`,
  instructions: [
    'Set assigneeUserId or assigneeTeamId to null to unassign.',
    'When setting tags, this replaces all existing tags on the ticket.'
  ]
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket to update'),
      status: z.enum(['open', 'closed']).optional().describe('New ticket status'),
      priority: z
        .enum(['urgent', 'high', 'normal', 'low'])
        .optional()
        .describe('New priority'),
      subject: z.string().optional().describe('New subject'),
      spam: z.boolean().optional().describe('Mark as spam'),
      language: z.string().optional().describe('Language code'),
      assigneeUserId: z
        .number()
        .nullable()
        .optional()
        .describe('Agent user ID to assign (null to unassign)'),
      assigneeTeamId: z
        .number()
        .nullable()
        .optional()
        .describe('Team ID to assign (null to unassign)'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Set ticket tags (replaces existing tags)'),
      customFields: z
        .array(
          z.object({
            fieldId: z.number().describe('Custom field ID'),
            value: z.any().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom field values to set'),
      externalId: z.string().optional().describe('External system identifier'),
      snoozeDatetime: z
        .string()
        .nullable()
        .optional()
        .describe('Snooze until this datetime (ISO 8601), or null to unsnooze'),
      meta: z.record(z.string(), z.any()).optional().describe('Custom metadata')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('Ticket ID'),
      status: z.string().describe('Updated status'),
      subject: z.string().nullable().describe('Updated subject'),
      priority: z.string().nullable().describe('Updated priority'),
      updatedDatetime: z.string().nullable().describe('When the ticket was updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let updateData: any = {};

    if (ctx.input.status !== undefined) updateData.status = ctx.input.status;
    if (ctx.input.priority !== undefined) updateData.priority = ctx.input.priority;
    if (ctx.input.subject !== undefined) updateData.subject = ctx.input.subject;
    if (ctx.input.spam !== undefined) updateData.spam = ctx.input.spam;
    if (ctx.input.language !== undefined) updateData.language = ctx.input.language;
    if (ctx.input.externalId !== undefined) updateData.external_id = ctx.input.externalId;
    if (ctx.input.meta !== undefined) updateData.meta = ctx.input.meta;
    if (ctx.input.snoozeDatetime !== undefined)
      updateData.snooze_datetime = ctx.input.snoozeDatetime;

    if (ctx.input.assigneeUserId !== undefined) {
      updateData.assignee_user =
        ctx.input.assigneeUserId !== null ? { id: ctx.input.assigneeUserId } : null;
    }

    if (ctx.input.assigneeTeamId !== undefined) {
      updateData.assignee_team =
        ctx.input.assigneeTeamId !== null ? { id: ctx.input.assigneeTeamId } : null;
    }

    if (ctx.input.tags !== undefined) {
      updateData.tags = ctx.input.tags.map(name => ({ name }));
    }

    if (ctx.input.customFields !== undefined) {
      updateData.custom_fields = ctx.input.customFields.map(cf => ({
        id: cf.fieldId,
        value: cf.value
      }));
    }

    let ticket = await client.updateTicket(ctx.input.ticketId, updateData);

    return {
      output: {
        ticketId: ticket.id,
        status: ticket.status,
        subject: ticket.subject || null,
        priority: ticket.priority || null,
        updatedDatetime: ticket.updated_datetime || null
      },
      message: `Updated ticket **#${ticket.id}** — "${ticket.subject || 'No subject'}" (${ticket.status}).`
    };
  })
  .build();
