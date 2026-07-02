import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send an email via SMTP2GO. Supports HTML and plain text bodies, CC/BCC recipients, file attachments, inline images, and email templates with personalization variables. At least one of **htmlBody**, **textBody**, or **templateId** must be provided.`,
  instructions: [
    'Attachments must have their content Base64-encoded in the fileblob field.',
    'When using a template, pass templateData to populate template variables.'
  ],
  constraints: [
    'Maximum of 100 recipients each for to, cc, and bcc fields.',
    'Maximum email size including content, attachments, and headers is 50 MB.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sender: z.string().describe('Sender/from email address'),
      to: z.array(z.string()).describe('Array of recipient email addresses'),
      subject: z.string().describe('Email subject line'),
      htmlBody: z.string().optional().describe('HTML-encoded email body'),
      textBody: z.string().optional().describe('Plain text email body'),
      cc: z.array(z.string()).optional().describe('Array of CC recipient email addresses'),
      bcc: z.array(z.string()).optional().describe('Array of BCC recipient email addresses'),
      customHeaders: z
        .array(
          z.object({
            header: z.string().describe('Header name'),
            value: z.string().describe('Header value')
          })
        )
        .optional()
        .describe('Custom email headers'),
      attachments: z
        .array(
          z.object({
            filename: z.string().describe('File name with extension'),
            fileblob: z.string().describe('Base64-encoded file content'),
            mimetype: z.string().describe('MIME type of the attachment')
          })
        )
        .optional()
        .describe('File attachments'),
      inlines: z
        .array(
          z.object({
            filename: z.string().describe('File name with extension'),
            fileblob: z.string().describe('Base64-encoded image content'),
            mimetype: z.string().describe('MIME type of the inline image')
          })
        )
        .optional()
        .describe('Inline images'),
      templateId: z.string().optional().describe('ID of a saved email template to use'),
      templateData: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs to populate template variables')
    })
  )
  .output(
    z.object({
      succeeded: z.number().describe('Number of emails successfully queued'),
      failed: z.number().describe('Number of emails that failed'),
      failures: z.array(z.string()).describe('Details of any failures'),
      emailId: z.string().describe('Unique identifier for the sent email')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.sendEmail({
      sender: ctx.input.sender,
      to: [...ctx.input.to],
      subject: ctx.input.subject,
      htmlBody: ctx.input.htmlBody,
      textBody: ctx.input.textBody,
      cc: ctx.input.cc ? [...ctx.input.cc] : undefined,
      bcc: ctx.input.bcc ? [...ctx.input.bcc] : undefined,
      customHeaders: ctx.input.customHeaders as
        | Array<{ header: string; value: string }>
        | undefined,
      attachments: ctx.input.attachments as
        | Array<{ filename: string; fileblob: string; mimetype: string }>
        | undefined,
      inlines: ctx.input.inlines as
        | Array<{ filename: string; fileblob: string; mimetype: string }>
        | undefined,
      templateId: ctx.input.templateId,
      templateData: ctx.input.templateData as Record<string, string> | undefined
    });
    let data = result.data || result.email_response || result;

    return {
      output: {
        succeeded: data.succeeded ?? 0,
        failed: data.failed ?? 0,
        failures: data.failures ?? [],
        emailId: data.email_id ?? ''
      },
      message: `Email sent to **${ctx.input.to.join(', ')}** with subject "${ctx.input.subject}". ${data.succeeded ?? 0} succeeded, ${data.failed ?? 0} failed.`
    };
  })
  .build();
