import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z.object({
  email: z.string().describe('Email address'),
  name: z.string().optional().describe('Display name')
});

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send a transactional email via MailerSend. Supports HTML and plain text content, or a pre-built template.
Allows CC/BCC recipients, reply-to addresses, attachments (base64-encoded), personalization variables, tags, and scheduled delivery up to 72 hours in advance.`,
  instructions: [
    'You must provide either html, text, or templateId as the email content.',
    'When using a template, personalization data can override template variables.',
    'Attachments must be base64-encoded. Maximum 25MB per attachment.',
    'Schedule future delivery using sendAt as a Unix timestamp (max 72 hours ahead).'
  ],
  constraints: [
    'Maximum 50 recipients in the "to" field.',
    'Maximum 10 CC and 10 BCC recipients.',
    'Maximum 5 tags per email.',
    'Subject max 998 characters. HTML and text max 2MB each.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      from: recipientSchema.describe(
        'Sender email and optional name. Must match a verified domain.'
      ),
      to: z.array(recipientSchema).min(1).describe('List of recipients (1-50).'),
      subject: z.string().optional().describe('Email subject line (max 998 characters).'),
      html: z.string().optional().describe('HTML content of the email.'),
      text: z.string().optional().describe('Plain text content of the email.'),
      templateId: z
        .string()
        .optional()
        .describe('MailerSend template ID to use instead of inline content.'),
      cc: z.array(recipientSchema).optional().describe('CC recipients (max 10).'),
      bcc: z.array(recipientSchema).optional().describe('BCC recipients (max 10).'),
      replyTo: recipientSchema.optional().describe('Reply-to address.'),
      attachments: z
        .array(
          z.object({
            filename: z.string().describe('Filename including extension.'),
            content: z.string().describe('Base64-encoded file content.'),
            disposition: z
              .enum(['attachment', 'inline'])
              .optional()
              .describe('Attachment disposition. Defaults to "attachment".'),
            attachmentId: z.string().optional().describe('Content ID for inline attachments.')
          })
        )
        .optional()
        .describe('File attachments.'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags for categorizing the email (max 5).'),
      personalization: z
        .array(
          z.object({
            email: z.string().describe('Recipient email to personalize for.'),
            data: z
              .record(z.string(), z.unknown())
              .describe('Key-value pairs of personalization variables.')
          })
        )
        .optional()
        .describe('Dynamic content personalization per recipient using {{variable}} syntax.'),
      variables: z
        .array(
          z.object({
            email: z.string().describe('Recipient email for variable substitution.'),
            substitutions: z
              .array(
                z.object({
                  var: z.string().describe('Variable name.'),
                  value: z.string().describe('Substitution value.')
                })
              )
              .describe('List of variable substitutions.')
          })
        )
        .optional()
        .describe('Simple variable substitutions per recipient using {$variable} syntax.'),
      sendAt: z
        .number()
        .optional()
        .describe('Unix timestamp for scheduled delivery (max 72 hours in the future).'),
      trackClicks: z.boolean().optional().describe('Enable click tracking.'),
      trackOpens: z.boolean().optional().describe('Enable open tracking.'),
      trackContent: z.boolean().optional().describe('Enable content tracking.')
    })
  )
  .output(
    z.object({
      messageId: z
        .string()
        .nullable()
        .describe('Unique message ID for tracking. Null if not returned.'),
      statusCode: z.number().describe('HTTP status code from the API.'),
      accepted: z.boolean().describe('Whether the email was accepted for delivery.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let settings =
      ctx.input.trackClicks !== undefined ||
      ctx.input.trackOpens !== undefined ||
      ctx.input.trackContent !== undefined
        ? {
            trackClicks: ctx.input.trackClicks,
            trackOpens: ctx.input.trackOpens,
            trackContent: ctx.input.trackContent
          }
        : undefined;

    let result = await client.sendEmail({
      from: ctx.input.from,
      to: ctx.input.to,
      subject: ctx.input.subject,
      html: ctx.input.html,
      text: ctx.input.text,
      templateId: ctx.input.templateId,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      replyTo: ctx.input.replyTo,
      attachments: ctx.input.attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        disposition: a.disposition,
        id: a.attachmentId
      })),
      tags: ctx.input.tags,
      personalization: ctx.input.personalization,
      variables: ctx.input.variables,
      sendAt: ctx.input.sendAt,
      settings
    });

    let accepted = result.statusCode >= 200 && result.statusCode < 300;

    if (!accepted) {
      ctx.warn(['Email was not accepted', result]);
    }

    return {
      output: {
        messageId: result.messageId,
        statusCode: result.statusCode,
        accepted
      },
      message: accepted
        ? `Email ${ctx.input.sendAt ? 'scheduled' : 'sent'} to **${ctx.input.to.map(r => r.email).join(', ')}**${result.messageId ? ` (Message ID: \`${result.messageId}\`)` : ''}.`
        : `Email sending failed with status ${result.statusCode}.`
    };
  })
  .build();
