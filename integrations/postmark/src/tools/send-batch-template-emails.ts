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

let batchTemplateMessageSchema = z.object({
  from: z.string().describe('Sender email address. Must be a confirmed sender signature.'),
  to: z.string().describe('Recipient email address(es). Comma-separated for multiple.'),
  cc: z.string().optional().describe('CC recipient email address(es).'),
  bcc: z.string().optional().describe('BCC recipient email address(es).'),
  templateId: z.number().optional().describe('Numeric template ID.'),
  templateAlias: z.string().optional().describe('Template alias string.'),
  templateModel: z
    .record(z.string(), z.any())
    .describe('Dynamic variables for the template as key-value pairs.'),
  replyTo: z.string().optional().describe('Reply-to email address.'),
  tag: z.string().optional().describe('Tag for categorizing the email.'),
  trackOpens: z.boolean().optional().describe('Enable open tracking.'),
  trackLinks: z
    .enum(['None', 'HtmlAndText', 'HtmlOnly', 'TextOnly'])
    .optional()
    .describe('Link tracking mode.'),
  messageStream: z.string().optional().describe('Message stream to send through.'),
  headers: z.array(headerSchema).optional().describe('Custom email headers.'),
  attachments: z.array(attachmentSchema).optional().describe('File attachments.'),
  metadata: z.record(z.string(), z.string()).optional().describe('Custom metadata.')
});

export let sendBatchTemplateEmails = SlateTool.create(spec, {
  name: 'Send Batch Template Emails',
  key: 'send_batch_template_emails',
  description: `Send up to 500 Postmark template emails in one batch API call. Each message can target a template by ID or alias and pass its own template model, recipients, headers, attachments, metadata, tracking settings, and message stream.`,
  instructions: [
    'Provide at least one message in **messages**.',
    'Each message must include either **templateId** or **templateAlias**.',
    'Each **templateModel** should include the variables required by that template.'
  ],
  constraints: [
    'Maximum 500 template messages per request.',
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
        .array(batchTemplateMessageSchema)
        .min(1)
        .max(500)
        .describe('Template messages to send through the Postmark batch endpoint.')
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
    let missingTemplateIndex = ctx.input.messages.findIndex(
      message => !message.templateId && !message.templateAlias
    );

    if (missingTemplateIndex !== -1) {
      throw postmarkServiceError(
        `messages[${missingTemplateIndex}] requires templateId or templateAlias.`
      );
    }

    let client = new Client({
      token: ctx.auth.token,
      accountToken: ctx.auth.accountToken
    });

    let results = await client.sendBatchTemplateEmails(ctx.input.messages);
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
      message: `Submitted **${mapped.length}** template email(s) through Postmark batch sending.`
    };
  });
