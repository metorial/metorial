import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendTransactionalEmail = SlateTool.create(spec, {
  name: 'Send Transactional Email',
  key: 'send_transactional_email',
  description: `Send a transactional email to a recipient. Supports HTML content or pre-built templates, personalization via substitution tags, CC/BCC recipients, and base64-encoded file attachments. Ideal for sending notifications, receipts, reminders, and other automated emails.`,
  instructions: [
    'Provide either **htmlContent** (full HTML) or **templateId** (pre-built template) — not both.',
    'The sender email domain must be a verified sending domain in Enginemailer.',
    'Substitution tags in the content should be wrapped in the format used in your template, and each tag must have a matching entry in **substitutionTags**.',
    'CC emails are limited to 10 comma-separated addresses.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      toEmail: z.string().describe('Recipient email address'),
      senderEmail: z.string().describe('Sender email address (must use a verified domain)'),
      senderName: z.string().describe('Display name for the sender'),
      subject: z.string().describe('Email subject line'),
      htmlContent: z
        .string()
        .optional()
        .describe('Full HTML content of the email (use this or templateId)'),
      templateId: z
        .string()
        .optional()
        .describe('ID of a pre-built email template to use (use this or htmlContent)'),
      substitutionTags: z
        .array(
          z.object({
            key: z.string().describe('Tag key name'),
            value: z.string().describe('Tag replacement value')
          })
        )
        .optional()
        .describe('Personalization substitution tags'),
      ccEmails: z.string().optional().describe('Comma-separated CC email addresses (max 10)'),
      bccEmails: z.string().optional().describe('Comma-separated BCC email addresses'),
      attachments: z
        .array(
          z.object({
            filename: z.string().describe('File name with extension'),
            contentBase64: z.string().describe('Base64-encoded file content')
          })
        )
        .optional()
        .describe('File attachments')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      statusCode: z.string().describe('Response status code'),
      message: z.string().optional().describe('Response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendTransactionalEmail({
      toEmail: ctx.input.toEmail,
      senderEmail: ctx.input.senderEmail,
      senderName: ctx.input.senderName,
      subject: ctx.input.subject,
      submittedContent: ctx.input.htmlContent,
      templateId: ctx.input.templateId,
      substitutionTags: ctx.input.substitutionTags?.map(t => ({
        Key: t.key,
        Value: t.value
      })),
      ccEmails: ctx.input.ccEmails,
      bccEmails: ctx.input.bccEmails,
      attachments: ctx.input.attachments?.map(a => ({
        Filename: a.filename,
        Content: a.contentBase64
      }))
    });

    return {
      output: {
        status: result.Result?.Status ?? 'Unknown',
        statusCode: result.Result?.StatusCode ?? 'Unknown',
        message: result.Result?.Message ?? result.Result?.ErrorMessage
      },
      message: `Sent transactional email to **${ctx.input.toEmail}** with subject "${ctx.input.subject}".`
    };
  })
  .build();
