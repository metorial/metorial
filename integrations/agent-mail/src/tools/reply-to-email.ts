import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attachmentSchema = z.object({
  filename: z.string().describe('Filename for the attachment'),
  contentType: z.string().optional().describe('MIME type of the attachment'),
  contentDisposition: z
    .enum(['inline', 'attachment'])
    .optional()
    .describe('How to display the attachment'),
  contentId: z.string().optional().describe('Content-ID header for inline attachments'),
  content: z.string().optional().describe('Base64-encoded file content'),
  url: z
    .string()
    .optional()
    .describe('URL to fetch the attachment from (alternative to content)')
});

export let replyToEmail = SlateTool.create(spec, {
  name: 'Reply to Email',
  key: 'reply_to_email',
  description: `Reply to an existing email message. Replies stay linked to the original thread. Use \`replyAll\` to reply to all original recipients. You can also add additional recipients via \`to\`, \`cc\`, and \`bcc\`.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Inbox containing the message to reply to'),
      messageId: z.string().describe('ID of the message to reply to'),
      text: z.string().optional().describe('Plain text reply body'),
      html: z.string().optional().describe('HTML reply body'),
      replyAll: z
        .boolean()
        .optional()
        .describe('Reply to all recipients of the original message'),
      to: z.array(z.string()).optional().describe('Additional recipients'),
      cc: z.array(z.string()).optional().describe('CC recipients'),
      bcc: z.array(z.string()).optional().describe('BCC recipients'),
      replyTo: z.array(z.string()).optional().describe('Reply-to addresses'),
      labels: z.array(z.string()).optional().describe('Labels to attach to the reply'),
      attachments: z.array(attachmentSchema).optional().describe('File attachments'),
      headers: z.record(z.string(), z.string()).optional().describe('Custom email headers')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the reply message'),
      threadId: z.string().describe('Thread the reply belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    let result = await client.replyToMessage(ctx.input.inboxId, ctx.input.messageId, {
      text: ctx.input.text,
      html: ctx.input.html,
      replyAll: ctx.input.replyAll,
      to: ctx.input.to,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      replyTo: ctx.input.replyTo,
      labels: ctx.input.labels,
      attachments: ctx.input.attachments,
      headers: ctx.input.headers
    });

    return {
      output: {
        messageId: result.message_id,
        threadId: result.thread_id
      },
      message: `Replied to message ${ctx.input.messageId}${ctx.input.replyAll ? ' (reply all)' : ''} in thread ${result.thread_id}.`
    };
  })
  .build();
