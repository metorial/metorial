import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMessage = SlateTool.create(spec, {
  name: 'Get Message',
  key: 'get_message',
  description: `Retrieve the full details of a specific email message including headers, body content, attachments metadata, and extracted text. The \`extractedText\` and \`extractedHtml\` fields contain the reply content without quoted history.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Inbox containing the message'),
      messageId: z.string().describe('Unique identifier of the message')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique message identifier'),
      inboxId: z.string().describe('Inbox the message belongs to'),
      threadId: z.string().describe('Thread the message belongs to'),
      labels: z.array(z.string()).describe('Message labels'),
      timestamp: z.string().describe('Message timestamp'),
      from: z.string().describe('Sender address'),
      to: z.array(z.string()).describe('Recipient addresses'),
      cc: z.array(z.string()).optional().describe('CC recipients'),
      bcc: z.array(z.string()).optional().describe('BCC recipients'),
      replyTo: z.array(z.string()).optional().describe('Reply-to addresses'),
      subject: z.string().optional().describe('Subject line'),
      text: z.string().optional().describe('Plain text body'),
      html: z.string().optional().describe('HTML body'),
      extractedText: z
        .string()
        .optional()
        .describe('Extracted reply text without quoted history'),
      extractedHtml: z
        .string()
        .optional()
        .describe('Extracted reply HTML without quoted history'),
      preview: z.string().optional().describe('Text preview'),
      attachments: z
        .array(
          z.object({
            attachmentId: z.string().describe('Attachment identifier'),
            filename: z.string().describe('Filename'),
            size: z.number().describe('Size in bytes'),
            contentType: z.string().optional().describe('MIME type')
          })
        )
        .optional()
        .describe('Attachment metadata'),
      size: z.number().describe('Message size in bytes'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });
    let m = await client.getMessage(ctx.input.inboxId, ctx.input.messageId);

    return {
      output: {
        messageId: m.message_id,
        inboxId: m.inbox_id,
        threadId: m.thread_id,
        labels: m.labels,
        timestamp: m.timestamp,
        from: m.from,
        to: m.to,
        cc: m.cc,
        bcc: m.bcc,
        replyTo: m.reply_to,
        subject: m.subject,
        text: m.text,
        html: m.html,
        extractedText: m.extracted_text,
        extractedHtml: m.extracted_html,
        preview: m.preview,
        attachments: m.attachments?.map(a => ({
          attachmentId: a.attachment_id,
          filename: a.filename,
          size: a.size,
          contentType: a.content_type
        })),
        size: m.size,
        createdAt: m.created_at
      },
      message: `Retrieved message from **${m.from}**${m.subject ? ` — "${m.subject}"` : ''}.`
    };
  })
  .build();
