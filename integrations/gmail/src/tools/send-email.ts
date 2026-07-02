import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send an email message to one or more recipients. Supports plain text and HTML bodies, CC/BCC recipients, file attachments (base64-encoded), and replying within existing threads.`,
  instructions: [
    'For HTML emails, set **isHtml** to true and provide HTML markup in the body field.',
    'To reply in an existing thread, provide the **threadId** along with **inReplyTo** (the Message-ID header of the message being replied to).',
    'Attachments must be base64-encoded. Provide the raw base64 string (not base64url).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(gmailActionScopes.sendEmail)
  .input(
    z.object({
      to: z.array(z.string()).describe('List of recipient email addresses.'),
      cc: z.array(z.string()).optional().describe('List of CC recipient email addresses.'),
      bcc: z.array(z.string()).optional().describe('List of BCC recipient email addresses.'),
      subject: z.string().describe('Email subject line.'),
      body: z.string().describe('Email body content. Plain text or HTML depending on isHtml.'),
      isHtml: z
        .boolean()
        .optional()
        .default(false)
        .describe('Set to true if body contains HTML content.'),
      threadId: z
        .string()
        .optional()
        .describe('Thread ID to send this message as part of an existing conversation.'),
      inReplyTo: z
        .string()
        .optional()
        .describe('Message-ID header value of the message being replied to.'),
      references: z.string().optional().describe('References header for threading context.'),
      attachments: z
        .array(
          z.object({
            filename: z.string().describe('Attachment file name including extension.'),
            mimeType: z
              .string()
              .describe('MIME type of the attachment (e.g., "application/pdf").'),
            content: z.string().describe('Base64-encoded file content.')
          })
        )
        .optional()
        .describe('File attachments to include.')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the sent message.'),
      threadId: z.string().describe('Thread ID the message belongs to.'),
      labelIds: z.array(z.string()).describe('Labels applied to the sent message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });

    let result = await client.sendMessage({
      to: ctx.input.to,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      subject: ctx.input.subject,
      body: ctx.input.body,
      isHtml: ctx.input.isHtml,
      threadId: ctx.input.threadId,
      inReplyTo: ctx.input.inReplyTo,
      references: ctx.input.references,
      attachments: ctx.input.attachments
    });

    return {
      output: {
        messageId: result.id,
        threadId: result.threadId,
        labelIds: result.labelIds || []
      },
      message: `Email sent to **${ctx.input.to.join(', ')}** with subject "${ctx.input.subject}".`
    };
  });
