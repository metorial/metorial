import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

export let createTicket = SlateTool.create(spec, {
  name: 'Create Ticket',
  key: 'create_ticket',
  description: `Creates a new support ticket in Zendesk. Supports setting subject, description (as initial comment), priority, type, status, assignee, group, tags, and custom fields. The first comment becomes the ticket description.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subject: z.string().describe('The subject/title of the ticket'),
      comment: z
        .object({
          body: z
            .string()
            .describe('The body text of the initial comment (becomes the ticket description)'),
          htmlBody: z
            .string()
            .optional()
            .describe('HTML-formatted body text (takes precedence over body if provided)'),
          public: z
            .boolean()
            .optional()
            .default(true)
            .describe('Whether the comment is public (visible to requester) or internal')
        })
        .describe('The initial comment/description of the ticket'),
      requesterId: z.string().optional().describe('User ID of the ticket requester'),
      requesterEmail: z
        .string()
        .optional()
        .describe(
          'Email of the requester (creates user if not found). Use instead of requesterId.'
        ),
      assigneeId: z
        .string()
        .optional()
        .describe('User ID of the agent to assign the ticket to'),
      groupId: z.string().optional().describe('Group ID to assign the ticket to'),
      type: z
        .enum(['problem', 'incident', 'question', 'task'])
        .optional()
        .describe('The type of ticket'),
      priority: z
        .enum(['urgent', 'high', 'normal', 'low'])
        .optional()
        .describe('The priority of the ticket'),
      status: z
        .enum(['new', 'open', 'pending', 'hold', 'solved', 'closed'])
        .optional()
        .describe('The status of the ticket'),
      tags: z.array(z.string()).optional().describe('Array of tags to add to the ticket'),
      customFields: z
        .array(
          z.object({
            fieldId: z.string().describe('The custom field ID'),
            value: z.any().describe('The value for the custom field')
          })
        )
        .optional()
        .describe('Custom field values to set on the ticket'),
      externalId: z
        .string()
        .optional()
        .describe('An external ID for linking to external systems')
    })
  )
  .output(
    z.object({
      ticketId: z.string().describe('The ID of the created ticket'),
      ticketUrl: z.string().describe('The URL of the created ticket in Zendesk'),
      subject: z.string().describe('The subject of the created ticket'),
      status: z.string().describe('The status of the created ticket')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let ticketData: Record<string, any> = {
      subject: ctx.input.subject,
      comment: {
        body: ctx.input.comment.body,
        html_body: ctx.input.comment.htmlBody,
        public: ctx.input.comment.public
      }
    };

    if (ctx.input.requesterId) ticketData.requester_id = ctx.input.requesterId;
    if (ctx.input.requesterEmail) ticketData.requester = { email: ctx.input.requesterEmail };
    if (ctx.input.assigneeId) ticketData.assignee_id = ctx.input.assigneeId;
    if (ctx.input.groupId) ticketData.group_id = ctx.input.groupId;
    if (ctx.input.type) ticketData.type = ctx.input.type;
    if (ctx.input.priority) ticketData.priority = ctx.input.priority;
    if (ctx.input.status) ticketData.status = ctx.input.status;
    if (ctx.input.tags) ticketData.tags = ctx.input.tags;
    if (ctx.input.externalId) ticketData.external_id = ctx.input.externalId;

    if (ctx.input.customFields) {
      ticketData.custom_fields = ctx.input.customFields.map(f => ({
        id: Number(f.fieldId),
        value: f.value
      }));
    }

    let ticket = await client.createTicket(ticketData);

    return {
      output: {
        ticketId: String(ticket.id),
        ticketUrl: `https://${ctx.config.subdomain}.zendesk.com/agent/tickets/${ticket.id}`,
        subject: ticket.subject,
        status: ticket.status
      },
      message: `Created ticket **#${ticket.id}**: ${ticket.subject}`
    };
  })
  .build();
