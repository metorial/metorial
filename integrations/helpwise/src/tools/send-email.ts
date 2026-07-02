import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send a new email or reply to an existing conversation from a Helpwise mailbox. Specify recipients, subject, body, and optionally CC/BCC. To reply to an existing thread, provide the conversationId.`,
  instructions: [
    'Provide a mailboxId to send from a specific shared inbox.',
    'To reply to an existing conversation, include the conversationId.'
  ]
})
  .input(
    z.object({
      mailboxId: z.string().describe('ID of the mailbox to send from'),
      to: z.string().describe('Recipient email address(es), comma-separated for multiple'),
      subject: z.string().describe('Email subject line'),
      body: z.string().describe('Email body content (HTML supported)'),
      cc: z.string().optional().describe('CC recipient email address(es), comma-separated'),
      bcc: z.string().optional().describe('BCC recipient email address(es), comma-separated'),
      conversationId: z
        .string()
        .optional()
        .describe('Conversation/thread ID to reply to (omit for new email)')
    })
  )
  .output(
    z.object({
      message: z.record(z.string(), z.any()).describe('Created email message details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendEmail({
      mailbox_id: ctx.input.mailboxId,
      to: ctx.input.to,
      subject: ctx.input.subject,
      body: ctx.input.body,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      thread_id: ctx.input.conversationId
    });

    let isReply = !!ctx.input.conversationId;
    return {
      output: { message: result },
      message: isReply
        ? `Replied to conversation **${ctx.input.conversationId}** to **${ctx.input.to}**.`
        : `Sent new email to **${ctx.input.to}** with subject "${ctx.input.subject}".`
    };
  })
  .build();
