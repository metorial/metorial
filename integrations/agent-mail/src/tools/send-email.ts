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

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send a new email from an inbox. Supports plain text and HTML bodies, attachments (base64 or URL), CC/BCC recipients, custom headers, and labels. AgentMail handles SPF, DKIM, and DMARC automatically.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Inbox to send the email from'),
      to: z.array(z.string()).describe('Recipient email addresses'),
      cc: z.array(z.string()).optional().describe('CC recipient email addresses'),
      bcc: z.array(z.string()).optional().describe('BCC recipient email addresses'),
      replyTo: z.array(z.string()).optional().describe('Reply-to email addresses'),
      subject: z.string().optional().describe('Email subject line'),
      text: z.string().optional().describe('Plain text email body'),
      html: z.string().optional().describe('HTML email body'),
      labels: z.array(z.string()).optional().describe('Labels to attach to the message'),
      attachments: z.array(attachmentSchema).optional().describe('File attachments'),
      headers: z.record(z.string(), z.string()).optional().describe('Custom email headers')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique identifier of the sent message'),
      threadId: z.string().describe('Thread the message belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    let result = await client.sendMessage(ctx.input.inboxId, {
      to: ctx.input.to,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      replyTo: ctx.input.replyTo,
      subject: ctx.input.subject,
      text: ctx.input.text,
      html: ctx.input.html,
      labels: ctx.input.labels,
      attachments: ctx.input.attachments,
      headers: ctx.input.headers
    });

    return {
      output: {
        messageId: result.message_id,
        threadId: result.thread_id
      },
      message: `Sent email to **${ctx.input.to.join(', ')}**${ctx.input.subject ? ` with subject "${ctx.input.subject}"` : ''}.`
    };
  })
  .build();
