import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addTicketConversation = SlateTool.create(spec, {
  name: 'Add Ticket Conversation',
  key: 'add_ticket_conversation',
  description: `Add a reply or note to an existing ticket. A **reply** sends an email to the requester, while a **note** is an internal comment visible only to agents (by default).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket'),
      conversationType: z.enum(['reply', 'note']).describe('Type of conversation to add'),
      body: z.string().describe('HTML content of the reply or note'),
      isPrivate: z
        .boolean()
        .optional()
        .describe('For notes: whether the note is private (default: true)'),
      ccEmails: z.array(z.string()).optional().describe('For replies: CC email addresses'),
      bccEmails: z.array(z.string()).optional().describe('For replies: BCC email addresses')
    })
  )
  .output(
    z.object({
      conversationId: z.number().describe('ID of the created conversation'),
      ticketId: z.number().describe('ID of the ticket'),
      bodyText: z.string().nullable().describe('Plain text content'),
      conversationType: z.string().describe('Type: reply or note'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let conversation: any;
    if (ctx.input.conversationType === 'reply') {
      conversation = await client.createTicketReply(
        ctx.input.ticketId,
        ctx.input.body,
        ctx.input.ccEmails,
        ctx.input.bccEmails
      );
    } else {
      conversation = await client.createTicketNote(
        ctx.input.ticketId,
        ctx.input.body,
        ctx.input.isPrivate
      );
    }

    return {
      output: {
        conversationId: conversation.id,
        ticketId: ctx.input.ticketId,
        bodyText: conversation.body_text,
        conversationType: ctx.input.conversationType,
        createdAt: conversation.created_at
      },
      message: `Added ${ctx.input.conversationType} to ticket **#${ctx.input.ticketId}**`
    };
  })
  .build();
