import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let addTicketReply = SlateTool.create(spec, {
  name: 'Add Ticket Reply',
  key: 'add_ticket_reply',
  description: `Sends a reply on a ticket visible to the requester. Can also add internal notes for agent-only collaboration. Use \`private\` to create an internal note instead of a customer-facing reply.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket to reply to'),
      body: z.string().describe('HTML content of the reply or note'),
      private: z
        .boolean()
        .optional()
        .describe(
          'If true, creates a private note instead of a public reply. Defaults to false.'
        ),
      ccEmails: z
        .array(z.string())
        .optional()
        .describe('Email addresses to CC (only for replies, not notes)'),
      bccEmails: z
        .array(z.string())
        .optional()
        .describe('Email addresses to BCC (only for replies)')
    })
  )
  .output(
    z.object({
      conversationId: z.number().describe('ID of the created conversation'),
      ticketId: z.number().describe('ID of the parent ticket'),
      isPrivate: z.boolean().describe('Whether this is a private note'),
      createdAt: z.string().describe('Timestamp when the conversation was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let conversation: any;

    if (ctx.input.private) {
      conversation = await client.addNote(ctx.input.ticketId, {
        body: ctx.input.body,
        private: true
      });
    } else {
      let replyData: Record<string, any> = {
        body: ctx.input.body
      };
      if (ctx.input.ccEmails) replyData.cc_emails = ctx.input.ccEmails;
      if (ctx.input.bccEmails) replyData.bcc_emails = ctx.input.bccEmails;
      conversation = await client.addReply(ctx.input.ticketId, replyData);
    }

    return {
      output: {
        conversationId: conversation.id,
        ticketId: ctx.input.ticketId,
        isPrivate: conversation.private ?? false,
        createdAt: conversation.created_at
      },
      message: ctx.input.private
        ? `Added private note to ticket **#${ctx.input.ticketId}**`
        : `Sent reply on ticket **#${ctx.input.ticketId}**`
    };
  })
  .build();
