import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

export let getTicket = SlateTool.create(spec, {
  name: 'Get Ticket',
  key: 'get_ticket',
  description: `Retrieves a single Zendesk support ticket by its ID, including all ticket details such as subject, status, priority, assignee, requester, tags, custom fields, and comments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('The ID of the ticket to retrieve'),
      includeComments: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also fetch the ticket comments')
    })
  )
  .output(
    z.object({
      ticketId: z.string().describe('The ticket ID'),
      ticketUrl: z.string().describe('The URL of the ticket in Zendesk'),
      subject: z.string().nullable().describe('The ticket subject'),
      description: z
        .string()
        .nullable()
        .describe('The ticket description (first comment body)'),
      status: z.string().describe('The ticket status'),
      priority: z.string().nullable().describe('The ticket priority'),
      type: z.string().nullable().describe('The ticket type'),
      requesterId: z.string().nullable().describe('The requester user ID'),
      assigneeId: z.string().nullable().describe('The assigned agent user ID'),
      groupId: z.string().nullable().describe('The assigned group ID'),
      tags: z.array(z.string()).describe('Tags on the ticket'),
      createdAt: z.string().describe('When the ticket was created'),
      updatedAt: z.string().describe('When the ticket was last updated'),
      customFields: z
        .array(
          z.object({
            fieldId: z.string(),
            value: z.any()
          })
        )
        .describe('Custom field values'),
      comments: z
        .array(
          z.object({
            commentId: z.string(),
            body: z.string().nullable(),
            htmlBody: z.string().nullable(),
            public: z.boolean(),
            authorId: z.string(),
            createdAt: z.string()
          })
        )
        .optional()
        .describe('Ticket comments (if includeComments was true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let ticket = await client.getTicket(ctx.input.ticketId);

    let comments: any[] | undefined;
    if (ctx.input.includeComments) {
      let commentsData = await client.getTicketComments(ctx.input.ticketId);
      comments = (commentsData.comments || []).map((c: any) => ({
        commentId: String(c.id),
        body: c.body || null,
        htmlBody: c.html_body || null,
        public: c.public,
        authorId: String(c.author_id),
        createdAt: c.created_at
      }));
    }

    let output: any = {
      ticketId: String(ticket.id),
      ticketUrl: `https://${ctx.config.subdomain}.zendesk.com/agent/tickets/${ticket.id}`,
      subject: ticket.subject || null,
      description: ticket.description || null,
      status: ticket.status,
      priority: ticket.priority || null,
      type: ticket.type || null,
      requesterId: ticket.requester_id ? String(ticket.requester_id) : null,
      assigneeId: ticket.assignee_id ? String(ticket.assignee_id) : null,
      groupId: ticket.group_id ? String(ticket.group_id) : null,
      tags: ticket.tags || [],
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      customFields: (ticket.custom_fields || []).map((f: any) => ({
        fieldId: String(f.id),
        value: f.value
      }))
    };

    if (comments) {
      output.comments = comments;
    }

    return {
      output,
      message: `Ticket **#${ticket.id}**: ${ticket.subject || '(no subject)'} — Status: ${ticket.status}${comments ? `, ${comments.length} comment(s)` : ''}`
    };
  })
  .build();
