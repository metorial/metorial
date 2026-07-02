import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send a transactional email to one or more recipients. Supports HTML and plain text content, attachments, CC/BCC, custom headers, reply-to addresses, metadata tags, and scheduled delivery. Use an idempotency key to prevent duplicate sends.`,
  constraints: [
    'Maximum 50 recipients per email.',
    'Total attachment size must not exceed 40MB.',
    'Rate limited to 2 requests per second.'
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
        .describe('Sender email address. Supports "Name <email@domain.com>" format.'),
      to: z
        .union([z.string(), z.array(z.string())])
        .describe('Recipient email address(es). Max 50.'),
      subject: z.string().describe('Email subject line.'),
      html: z.string().optional().describe('HTML content of the email.'),
      text: z.string().optional().describe('Plain text content of the email.'),
      cc: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('CC recipient(s).'),
      bcc: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('BCC recipient(s).'),
      replyTo: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Reply-to address(es).'),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom email headers as key-value pairs.'),
      attachments: z
        .array(
          z.object({
            content: z.string().optional().describe('Base64 encoded file content.'),
            filename: z.string().optional().describe('Name of the file.'),
            path: z.string().optional().describe('URL to fetch the attachment from.'),
            contentType: z.string().optional().describe('MIME type of the attachment.')
          })
        )
        .optional()
        .describe('File attachments (max 40MB total).'),
      tags: z
        .array(
          z.object({
            name: z.string().describe('Tag name (max 256 chars).'),
            value: z.string().describe('Tag value (max 256 chars).')
          })
        )
        .optional()
        .describe('Metadata tags for the email.'),
      scheduledAt: z
        .string()
        .optional()
        .describe('Schedule delivery time in ISO 8601 format or natural language.'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key to prevent duplicate sends (24-hour expiry, max 256 chars).')
    })
  )
  .output(
    z.object({
      emailId: z.string().describe('ID of the sent email.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendEmail({
      from: ctx.input.from,
      to: ctx.input.to,
      subject: ctx.input.subject,
      html: ctx.input.html,
      text: ctx.input.text,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      replyTo: ctx.input.replyTo,
      headers: ctx.input.headers,
      attachments: ctx.input.attachments,
      tags: ctx.input.tags,
      scheduledAt: ctx.input.scheduledAt,
      idempotencyKey: ctx.input.idempotencyKey
    });

    let scheduled = ctx.input.scheduledAt ? ` (scheduled for ${ctx.input.scheduledAt})` : '';
    let recipients = Array.isArray(ctx.input.to) ? ctx.input.to.join(', ') : ctx.input.to;

    return {
      output: {
        emailId: result.id
      },
      message: `Email sent to **${recipients}**${scheduled} with ID \`${result.id}\`.`
    };
  })
  .build();
