import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { postmarkServiceError } from '../lib/errors';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send a transactional or broadcast email via Postmark. Supports HTML and plain text bodies, CC/BCC recipients, attachments, custom headers, metadata, and open/click tracking. The sender must be a registered and confirmed sender signature in Postmark.`,
  instructions: [
    'Provide at least one of **htmlBody** or **textBody** — both can be included for multipart messages.',
    'Use the **messageStream** field to send through a specific stream (defaults to "outbound" for transactional).',
    'Attachments must be base64-encoded content strings.'
  ],
  constraints: [
    'Maximum 50 recipients across To, Cc, and Bcc combined.',
    'Sender must have a confirmed sender signature in Postmark.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      from: z
        .string()
        .describe(
          'Sender email address. Must be a confirmed sender signature. Supports "Name <email>" format.'
        ),
      to: z
        .string()
        .describe('Recipient email address(es). Comma-separated for multiple recipients.'),
      cc: z
        .string()
        .optional()
        .describe('CC recipient email address(es). Comma-separated for multiple.'),
      bcc: z
        .string()
        .optional()
        .describe('BCC recipient email address(es). Comma-separated for multiple.'),
      subject: z.string().describe('Email subject line.'),
      htmlBody: z.string().optional().describe('HTML body content.'),
      textBody: z.string().optional().describe('Plain text body content.'),
      replyTo: z.string().optional().describe('Reply-to email address.'),
      tag: z.string().optional().describe('Tag for categorizing the email.'),
      trackOpens: z.boolean().optional().describe('Enable open tracking for this email.'),
      trackLinks: z
        .enum(['None', 'HtmlAndText', 'HtmlOnly', 'TextOnly'])
        .optional()
        .describe('Link tracking mode.'),
      messageStream: z
        .string()
        .optional()
        .describe('Message stream to send through (e.g., "outbound", "broadcasts").'),
      headers: z
        .array(
          z.object({
            name: z.string().describe('Header name.'),
            value: z.string().describe('Header value.')
          })
        )
        .optional()
        .describe('Custom email headers.'),
      attachments: z
        .array(
          z.object({
            name: z.string().describe('Attachment filename.'),
            content: z.string().describe('Base64-encoded attachment content.'),
            contentType: z.string().describe('MIME type of the attachment.'),
            contentId: z
              .string()
              .optional()
              .describe('Content ID for inline/embedded attachments.')
          })
        )
        .optional()
        .describe('File attachments.'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata key-value pairs to include with the email.')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique Postmark message ID.'),
      submittedAt: z.string().describe('Timestamp when the email was submitted.'),
      to: z.string().describe('Recipient address(es).'),
      errorCode: z.number().describe('Postmark error code (0 = success).'),
      statusMessage: z.string().describe('Status message from Postmark.')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.htmlBody && !ctx.input.textBody) {
      throw postmarkServiceError('htmlBody or textBody is required for sending email.');
    }

    let client = new Client({
      token: ctx.auth.token,
      accountToken: ctx.auth.accountToken
    });

    let result = await client.sendEmail({
      from: ctx.input.from,
      to: ctx.input.to,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      subject: ctx.input.subject,
      htmlBody: ctx.input.htmlBody,
      textBody: ctx.input.textBody,
      replyTo: ctx.input.replyTo,
      tag: ctx.input.tag,
      trackOpens: ctx.input.trackOpens,
      trackLinks: ctx.input.trackLinks,
      messageStream: ctx.input.messageStream,
      headers: ctx.input.headers,
      attachments: ctx.input.attachments,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        messageId: result.MessageID,
        submittedAt: result.SubmittedAt,
        to: result.To,
        errorCode: result.ErrorCode,
        statusMessage: result.Message
      },
      message: `Email sent to **${ctx.input.to}** with subject "${ctx.input.subject}". Message ID: \`${result.MessageID}\``
    };
  });
