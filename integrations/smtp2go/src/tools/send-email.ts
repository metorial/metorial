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
    'When using a template, pass templateData to populate template variables.',
    'If countsAvailable is false, the zero counts and empty failures are placeholders. Track the accepted email using its identifiers and Search Email Activity; unavailable counts do not mean the submission failed.'
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
      to: z.array(z.string()).min(1).max(100).describe('Array of recipient email addresses'),
      subject: z
        .string()
        .describe('Email subject line; ignored when a saved template is used'),
      htmlBody: z.string().optional().describe('HTML-encoded email body'),
      textBody: z.string().optional().describe('Plain text email body'),
      cc: z
        .array(z.string())
        .max(100)
        .optional()
        .describe('Array of CC recipient email addresses'),
      bcc: z
        .array(z.string())
        .max(100)
        .optional()
        .describe('Array of BCC recipient email addresses'),
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
        .describe('Key-value pairs to populate template variables'),
      schedule: z
        .string()
        .optional()
        .describe('Future send timestamp with timezone, within the next 3 days'),
      fastAccept: z
        .boolean()
        .optional()
        .describe('Queue the email immediately and process it in the background')
    })
  )
  .output(
    z.object({
      succeeded: z
        .number()
        .describe(
          'Provider-reported successful processing count; zero is a placeholder when countsAvailable is false'
        ),
      failed: z
        .number()
        .describe(
          'Provider-reported failed processing count; zero is a placeholder when countsAvailable is false'
        ),
      failures: z
        .array(z.string())
        .describe(
          'Provider-reported failures; empty is a placeholder when countsAvailable is false'
        ),
      countsAvailable: z.boolean().describe('Whether SMTP2GO returned processing counts'),
      processingPending: z
        .boolean()
        .describe('Whether processing results are still unavailable'),
      emailId: z.string().describe('Unique identifier for the sent email, when returned'),
      scheduleId: z
        .string()
        .optional()
        .describe('Identifier of the scheduled email, when returned')
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
      templateData: ctx.input.templateData as Record<string, string> | undefined,
      schedule: ctx.input.schedule,
      fastAccept: ctx.input.fastAccept
    });
    let data = result.data || result.email_response || result;
    let countsAvailable =
      typeof data.succeeded === 'number' && typeof data.failed === 'number';

    return {
      output: {
        succeeded: data.succeeded ?? 0,
        failed: data.failed ?? 0,
        failures: data.failures ?? [],
        countsAvailable,
        processingPending: !countsAvailable,
        emailId: data.email_id ?? '',
        scheduleId: data.schedule_id
      },
      message: countsAvailable
        ? `Email submission processed for **${ctx.input.to.join(', ')}** with subject "${ctx.input.subject}". ${data.succeeded} succeeded, ${data.failed} failed.`
        : `Email accepted for ${data.schedule_id ? 'scheduled sending' : 'background processing'}. Processing results are pending; use Search Email Activity to check delivery status.`
    };
  })
  .build();
