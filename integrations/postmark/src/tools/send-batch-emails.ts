import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { postmarkServiceError } from '../lib/errors';
import { spec } from '../spec';

let headerSchema = z.object({
  name: z.string().describe('Header name.'),
  value: z.string().describe('Header value.')
});

let attachmentSchema = z.object({
  name: z.string().describe('Attachment filename.'),
  content: z.string().describe('Base64-encoded attachment content.'),
  contentType: z.string().describe('MIME type of the attachment.'),
  contentId: z.string().optional().describe('Content ID for inline/embedded attachments.')
});

let batchMessageSchema = z.object({
  from: z
    .string()
    .describe(
      'Sender email address. Must be a confirmed sender signature. Supports "Name <email>" format.'
    ),
  to: z.string().describe('Recipient email address(es). Comma-separated for multiple.'),
  cc: z.string().optional().describe('CC recipient email address(es).'),
  bcc: z.string().optional().describe('BCC recipient email address(es).'),
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
  headers: z.array(headerSchema).optional().describe('Custom email headers.'),
  attachments: z.array(attachmentSchema).optional().describe('File attachments.'),
  metadata: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom metadata key-value pairs to include with the email.')
});

export let sendBatchEmails = SlateTool.create(spec, {
  name: 'Send Batch Emails',
  key: 'send_batch_emails',
  description: `Send up to 500 individually addressed Postmark emails in a single batch API call. Each message can have its own sender, recipients, subject, body, headers, attachments, metadata, tracking settings, and message stream.`,
  instructions: [
    'Provide at least one message in **messages**.',
    'Each message must include at least one of **htmlBody** or **textBody**.',
    'Use this for individualized messages. For one shared campaign body, use Postmark Bulk API directly if your account has Bulk API approval.'
  ],
  constraints: [
    'Maximum 500 messages per request.',
    'Maximum 50 MB total payload size, including attachments.',
    'Maximum 50 recipients across To, Cc, and Bcc per message.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messages: z
        .array(batchMessageSchema)
        .min(1)
        .max(500)
        .describe('Messages to send through the Postmark batch endpoint.')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            messageId: z.string().describe('Unique Postmark message ID.'),
            submittedAt: z.string().describe('Timestamp when the email was submitted.'),
            to: z.string().describe('Recipient address(es).'),
            errorCode: z.number().describe('Postmark error code (0 = success).'),
            statusMessage: z.string().describe('Status message from Postmark.')
          })
        )
        .describe('Per-message batch results.'),
      sentCount: z.number().describe('Number of accepted messages returned by Postmark.')
    })
  )
  .handleInvocation(async ctx => {
    let missingBodyIndex = ctx.input.messages.findIndex(
      message => !message.htmlBody && !message.textBody
    );

    if (missingBodyIndex !== -1) {
      throw postmarkServiceError(
        `messages[${missingBodyIndex}] requires htmlBody or textBody.`
      );
    }

    let client = new Client({
      token: ctx.auth.token,
      accountToken: ctx.auth.accountToken
    });

    let results = await client.sendBatchEmails(ctx.input.messages);
    let mapped = results.map(result => ({
      messageId: result.MessageID,
      submittedAt: result.SubmittedAt,
      to: result.To,
      errorCode: result.ErrorCode,
      statusMessage: result.Message
    }));

    return {
      output: {
        results: mapped,
        sentCount: mapped.length
      },
      message: `Submitted **${mapped.length}** email(s) through Postmark batch sending.`
    };
  });
