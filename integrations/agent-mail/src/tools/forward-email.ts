import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let forwardEmail = SlateTool.create(spec, {
  name: 'Forward Email',
  key: 'forward_email',
  description: `Forward an existing email message to new recipients. The original message content is included and you can add additional text or recipients.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Inbox containing the message to forward'),
      messageId: z.string().describe('ID of the message to forward'),
      to: z.array(z.string()).describe('Recipients to forward the message to'),
      cc: z.array(z.string()).optional().describe('CC recipients'),
      bcc: z.array(z.string()).optional().describe('BCC recipients'),
      subject: z.string().optional().describe('Override the forwarded subject line'),
      text: z.string().optional().describe('Additional plain text to prepend'),
      html: z.string().optional().describe('Additional HTML to prepend'),
      labels: z
        .array(z.string())
        .optional()
        .describe('Labels to attach to the forwarded message')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the forwarded message'),
      threadId: z.string().describe('Thread the forwarded message belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    let result = await client.forwardMessage(ctx.input.inboxId, ctx.input.messageId, {
      to: ctx.input.to,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      subject: ctx.input.subject,
      text: ctx.input.text,
      html: ctx.input.html,
      labels: ctx.input.labels
    });

    return {
      output: {
        messageId: result.message_id,
        threadId: result.thread_id
      },
      message: `Forwarded message ${ctx.input.messageId} to **${ctx.input.to.join(', ')}**.`
    };
  })
  .build();
