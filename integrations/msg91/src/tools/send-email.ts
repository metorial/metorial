import { SlateTool } from 'slates';
import { z } from 'zod';
import { Msg91Client } from '../lib/client';
import { spec } from '../spec';

let emailRecipientSchema = z.object({
  name: z.string().optional().describe('Recipient name'),
  email: z.string().describe('Recipient email address')
});

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send transactional emails using a pre-created template. Supports HTML templates with variable mapping, multiple recipients with CC/BCC, attachments, and reply-to addresses.`,
  instructions: [
    'Template ID must be created in the MSG91 email dashboard before use.',
    'The sender domain must be verified in MSG91.',
    'Variables in the template (Handlebars syntax) are populated from the variables object in each recipient group.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Email template ID from the MSG91 dashboard'),
      from: z
        .object({
          name: z.string().describe('Sender name'),
          email: z.string().describe('Sender email address')
        })
        .describe('Sender information'),
      domain: z.string().describe('Verified sender domain in MSG91'),
      recipients: z
        .array(
          z.object({
            to: z.array(emailRecipientSchema).describe('Primary recipients'),
            cc: z.array(emailRecipientSchema).optional().describe('CC recipients'),
            bcc: z.array(emailRecipientSchema).optional().describe('BCC recipients'),
            variables: z
              .record(z.string(), z.string())
              .optional()
              .describe('Template variables as key-value pairs')
          })
        )
        .describe('Array of recipient groups with optional CC, BCC, and template variables'),
      subject: z
        .string()
        .optional()
        .describe('Email subject (overrides template subject if provided)'),
      replyTo: z
        .array(
          z.object({
            email: z.string().describe('Reply-to email address')
          })
        )
        .optional()
        .describe('Reply-to email addresses'),
      attachments: z
        .array(
          z.object({
            filePath: z.string().describe('Public URL of the file to attach'),
            fileName: z.string().describe('Display name of the attachment')
          })
        )
        .optional()
        .describe('File attachments')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      threadId: z.any().optional().describe('Email thread ID'),
      uniqueId: z.string().optional().describe('Unique request identifier'),
      messageId: z.string().optional().describe('Email message ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });

    let result = await client.sendEmail({
      templateId: ctx.input.templateId,
      from: ctx.input.from,
      domain: ctx.input.domain,
      recipients: ctx.input.recipients,
      subject: ctx.input.subject,
      replyTo: ctx.input.replyTo,
      attachments: ctx.input.attachments
    });

    let data = result.data || {};

    return {
      output: {
        status: result.status || 'success',
        threadId: data.thread_id,
        uniqueId: data.unique_id,
        messageId: data.message_id
      },
      message: `Email sent from **${ctx.input.from.email}** using template \`${ctx.input.templateId}\`. Unique ID: \`${data.unique_id || 'N/A'}\``
    };
  })
  .build();
