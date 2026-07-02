import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

export let updateTicket = SlateTool.create(spec, {
  name: 'Update Ticket',
  key: 'update_ticket',
  description: `Updates an existing Zendesk support ticket. Can modify subject, status, priority, type, assignee, group, tags, and custom fields. Optionally adds a new comment (public or internal note).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('The ID of the ticket to update'),
      subject: z.string().optional().describe('New subject for the ticket'),
      status: z
        .enum(['new', 'open', 'pending', 'hold', 'solved', 'closed'])
        .optional()
        .describe('New status for the ticket'),
      priority: z
        .enum(['urgent', 'high', 'normal', 'low'])
        .optional()
        .describe('New priority for the ticket'),
      type: z
        .enum(['problem', 'incident', 'question', 'task'])
        .optional()
        .describe('New type for the ticket'),
      assigneeId: z
        .string()
        .optional()
        .describe('User ID of the agent to assign the ticket to'),
      groupId: z.string().optional().describe('Group ID to assign the ticket to'),
      tags: z.array(z.string()).optional().describe('Replace all tags with this array'),
      additionalTags: z
        .array(z.string())
        .optional()
        .describe('Tags to add (keeps existing tags)'),
      removeTags: z.array(z.string()).optional().describe('Tags to remove'),
      comment: z
        .object({
          body: z.string().describe('The body text of the comment'),
          htmlBody: z.string().optional().describe('HTML-formatted body text'),
          public: z
            .boolean()
            .optional()
            .default(true)
            .describe('Whether the comment is public or an internal note'),
          authorId: z.string().optional().describe('Author user ID (for impersonation)')
        })
        .optional()
        .describe('Add a new comment to the ticket'),
      customFields: z
        .array(
          z.object({
            fieldId: z.string().describe('The custom field ID'),
            value: z.any().describe('The value for the custom field')
          })
        )
        .optional()
        .describe('Custom field values to update'),
      externalId: z
        .string()
        .optional()
        .describe('An external ID for linking to external systems')
    })
  )
  .output(
    z.object({
      ticketId: z.string().describe('The ID of the updated ticket'),
      ticketUrl: z.string().describe('The URL of the updated ticket'),
      subject: z.string().nullable().describe('The subject of the updated ticket'),
      status: z.string().describe('The status of the updated ticket')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let ticketData: Record<string, any> = {};

    if (ctx.input.subject !== undefined) ticketData.subject = ctx.input.subject;
    if (ctx.input.status !== undefined) ticketData.status = ctx.input.status;
    if (ctx.input.priority !== undefined) ticketData.priority = ctx.input.priority;
    if (ctx.input.type !== undefined) ticketData.type = ctx.input.type;
    if (ctx.input.assigneeId !== undefined) ticketData.assignee_id = ctx.input.assigneeId;
    if (ctx.input.groupId !== undefined) ticketData.group_id = ctx.input.groupId;
    if (ctx.input.tags !== undefined) ticketData.tags = ctx.input.tags;
    if (ctx.input.additionalTags !== undefined)
      ticketData.additional_tags = ctx.input.additionalTags;
    if (ctx.input.removeTags !== undefined) ticketData.remove_tags = ctx.input.removeTags;
    if (ctx.input.externalId !== undefined) ticketData.external_id = ctx.input.externalId;

    if (ctx.input.comment) {
      ticketData.comment = {
        body: ctx.input.comment.body,
        html_body: ctx.input.comment.htmlBody,
        public: ctx.input.comment.public,
        author_id: ctx.input.comment.authorId
      };
    }

    if (ctx.input.customFields) {
      ticketData.custom_fields = ctx.input.customFields.map(f => ({
        id: Number(f.fieldId),
        value: f.value
      }));
    }

    let ticket = await client.updateTicket(ctx.input.ticketId, ticketData);

    return {
      output: {
        ticketId: String(ticket.id),
        ticketUrl: `https://${ctx.config.subdomain}.zendesk.com/agent/tickets/${ticket.id}`,
        subject: ticket.subject || null,
        status: ticket.status
      },
      message: `Updated ticket **#${ticket.id}**: ${ticket.subject || '(no subject)'} — Status: ${ticket.status}`
    };
  })
  .build();
