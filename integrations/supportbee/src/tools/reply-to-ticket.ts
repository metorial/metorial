import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { replySchema } from '../lib/types';
import { spec } from '../spec';

export let replyToTicket = SlateTool.create(spec, {
  name: 'Reply to Ticket',
  key: 'reply_to_ticket',
  description: `Send a reply to a support ticket. The reply is sent to the customer. Supports plain text and HTML content, CC/BCC recipients, file attachments, and sending on behalf of another agent.`,
  instructions: [
    'Provide either contentText or contentHtml (or both). At least one is required.',
    'Use onBehalfOfEmail or onBehalfOfId to send the reply as another agent.'
  ]
})
  .input(
    z.object({
      ticketId: z.number().describe('The ID of the ticket to reply to'),
      contentText: z.string().optional().describe('Plain text reply content'),
      contentHtml: z.string().optional().describe('HTML reply content'),
      cc: z.array(z.string()).optional().describe('CC email addresses'),
      bcc: z.array(z.string()).optional().describe('BCC email addresses'),
      attachmentIds: z
        .array(z.number())
        .optional()
        .describe('IDs of previously uploaded attachments'),
      onBehalfOfId: z.number().optional().describe('Send reply on behalf of this user ID'),
      onBehalfOfEmail: z
        .string()
        .optional()
        .describe('Send reply on behalf of this email address')
    })
  )
  .output(replySchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companySubdomain: ctx.config.companySubdomain
    });

    let reply = await client.createReply(ctx.input.ticketId, {
      contentText: ctx.input.contentText,
      contentHtml: ctx.input.contentHtml,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      attachmentIds: ctx.input.attachmentIds,
      onBehalfOfId: ctx.input.onBehalfOfId,
      onBehalfOfEmail: ctx.input.onBehalfOfEmail
    });

    return {
      output: reply,
      message: `Reply **#${reply.replyId}** sent on ticket **#${ctx.input.ticketId}**`
    };
  })
  .build();
