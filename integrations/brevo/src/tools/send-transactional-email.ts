import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z.object({
  email: z.string().describe('Email address'),
  name: z.string().optional().describe('Recipient name')
});

export let sendTransactionalEmail = SlateTool.create(spec, {
  name: 'Send Transactional Email',
  key: 'send_transactional_email',
  description: `Send a transactional email via Brevo SMTP. Supports HTML content, templates, dynamic personalization parameters, attachments, CC/BCC, and scheduling.
Use for automated messages like order confirmations, password resets, or any triggered email communication.`,
  instructions: [
    'Provide either htmlContent or templateId, not both.',
    'The sender email must be a verified sender in your Brevo account.',
    'Use params to inject dynamic variables into templates or HTML content.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      senderEmail: z.string().describe('Verified sender email address'),
      senderName: z.string().optional().describe('Sender display name'),
      to: z.array(recipientSchema).describe('Primary recipients'),
      cc: z.array(recipientSchema).optional().describe('CC recipients'),
      bcc: z.array(recipientSchema).optional().describe('BCC recipients'),
      replyToEmail: z.string().optional().describe('Reply-to email address'),
      replyToName: z.string().optional().describe('Reply-to display name'),
      subject: z.string().optional().describe('Email subject line'),
      htmlContent: z.string().optional().describe('HTML email body'),
      textContent: z.string().optional().describe('Plain text email body'),
      templateId: z
        .number()
        .optional()
        .describe('Brevo template ID to use instead of inline content'),
      templateParams: z
        .record(z.string(), z.any())
        .optional()
        .describe('Dynamic variables for template personalization'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags for categorizing and tracking the email'),
      scheduledAt: z.string().optional().describe('ISO 8601 date-time to schedule the email'),
      attachments: z
        .array(
          z.object({
            name: z.string().describe('Attachment filename'),
            url: z.string().optional().describe('URL to fetch attachment from'),
            content: z.string().optional().describe('Base64-encoded attachment content')
          })
        )
        .optional()
        .describe('File attachments')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique message ID for tracking delivery events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.sendTransactionalEmail({
      sender: { email: ctx.input.senderEmail, name: ctx.input.senderName },
      to: ctx.input.to,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      replyTo: ctx.input.replyToEmail
        ? { email: ctx.input.replyToEmail, name: ctx.input.replyToName }
        : undefined,
      subject: ctx.input.subject,
      htmlContent: ctx.input.htmlContent,
      textContent: ctx.input.textContent,
      templateId: ctx.input.templateId,
      params: ctx.input.templateParams,
      tags: ctx.input.tags,
      scheduledAt: ctx.input.scheduledAt,
      attachment: ctx.input.attachments
    });

    return {
      output: { messageId: result.messageId },
      message: `Transactional email sent successfully to **${ctx.input.to.map(r => r.email).join(', ')}**. Message ID: \`${result.messageId}\``
    };
  });
