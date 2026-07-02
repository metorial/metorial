import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailtrapClient } from '../lib/client';
import { spec } from '../spec';

let emailAddressSchema = z.object({
  email: z.string().describe('Email address'),
  name: z.string().optional().describe('Display name')
});

let attachmentSchema = z.object({
  content: z.string().describe('Base64-encoded file content'),
  filename: z.string().describe('Filename with extension'),
  type: z.string().optional().describe('MIME type (e.g., application/pdf)'),
  disposition: z.enum(['attachment', 'inline']).optional().describe('Attachment disposition'),
  contentId: z.string().optional().describe('Content ID for inline attachments')
});

export let sendBulkEmail = SlateTool.create(spec, {
  name: 'Send Bulk Email',
  key: 'send_bulk_email',
  description: `Send a bulk/promotional email using Mailtrap's dedicated bulk infrastructure. Designed for marketing campaigns, newsletters, and non-transactional emails. Sending through the bulk stream protects your transactional email reputation. Mailtrap automatically adds unsubscribe headers.`,
  instructions: [
    'Either provide text/html content or a templateUuid, not both.',
    'The sending domain must be verified before sending.',
    'Use this for marketing/promotional emails, not transactional ones.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      from: emailAddressSchema.describe('Sender email address and optional name'),
      to: z.array(emailAddressSchema).min(1).describe('List of recipient email addresses'),
      subject: z.string().describe('Email subject line'),
      cc: z.array(emailAddressSchema).optional().describe('CC recipients'),
      bcc: z.array(emailAddressSchema).optional().describe('BCC recipients'),
      replyTo: emailAddressSchema.optional().describe('Reply-to address'),
      text: z.string().optional().describe('Plain text email body'),
      html: z.string().optional().describe('HTML email body'),
      templateUuid: z.string().optional().describe('UUID of a pre-built email template'),
      templateVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Variables to substitute in the template'),
      attachments: z.array(attachmentSchema).optional().describe('File attachments'),
      category: z.string().optional().describe('Email category for analytics grouping'),
      customVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value pairs for tracking'),
      headers: z.record(z.string(), z.string()).optional().describe('Custom email headers')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the email was sent successfully'),
      messageIds: z.array(z.string()).describe('Array of message IDs for each recipient')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailtrapClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.sendBulkEmail({
      from: ctx.input.from,
      to: [...ctx.input.to],
      subject: ctx.input.subject,
      cc: ctx.input.cc ? [...ctx.input.cc] : undefined,
      bcc: ctx.input.bcc ? [...ctx.input.bcc] : undefined,
      replyTo: ctx.input.replyTo,
      text: ctx.input.text,
      html: ctx.input.html,
      templateUuid: ctx.input.templateUuid,
      templateVariables: ctx.input.templateVariables
        ? { ...ctx.input.templateVariables }
        : undefined,
      attachments: ctx.input.attachments
        ? ctx.input.attachments.map(a => ({ ...a }))
        : undefined,
      category: ctx.input.category,
      customVariables: ctx.input.customVariables
        ? { ...ctx.input.customVariables }
        : undefined,
      headers: ctx.input.headers ? { ...ctx.input.headers } : undefined
    });

    return {
      output: {
        success: result.success,
        messageIds: result.message_ids || []
      },
      message: `Bulk email sent to **${ctx.input.to.map(r => r.email).join(', ')}** with subject "${ctx.input.subject}". Message IDs: ${(result.message_ids || []).join(', ')}`
    };
  })
  .build();
