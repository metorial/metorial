import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send an email to one or more recipients. Supports HTML and plain text content, click/open tracking, reply-to configuration, and file attachments (referenced by attachment IDs from a prior upload).`,
  constraints: [
    'Maximum 10 recipient email addresses per API call.',
    'The "from" email must be verified in the Zixflow dashboard.',
    'Either bodyHtml or bodyText must be provided.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: z.array(z.string()).describe('Recipient email addresses (max 10)'),
      subject: z.string().describe('Email subject line'),
      fromEmail: z.string().describe('Verified sender email address'),
      fromName: z.string().describe('Sender display name'),
      bodyHtml: z.string().optional().describe('HTML email body content'),
      bodyText: z.string().optional().describe('Plain text email body content'),
      trackClicks: z.boolean().optional().describe('Enable click tracking'),
      trackOpens: z.boolean().optional().describe('Enable open tracking'),
      replyToEmail: z.string().optional().describe('Reply-to email address'),
      replyToName: z.string().optional().describe('Reply-to display name'),
      attachmentIds: z
        .array(z.string())
        .optional()
        .describe('Array of attachment IDs from the upload API')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the email was sent successfully'),
      responseMessage: z.string().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZixflowClient({ token: ctx.auth.token });

    let result = await client.sendEmail({
      to: ctx.input.to,
      subject: ctx.input.subject,
      from: ctx.input.fromEmail,
      fromName: ctx.input.fromName,
      bodyHtml: ctx.input.bodyHtml,
      bodyText: ctx.input.bodyText,
      trackClicks: ctx.input.trackClicks,
      trackOpens: ctx.input.trackOpens,
      replyToEmail: ctx.input.replyToEmail,
      replyToName: ctx.input.replyToName,
      attachments: ctx.input.attachmentIds
    });

    return {
      output: {
        success: result.status === true,
        responseMessage: result.message ?? 'Unknown response'
      },
      message: result.status
        ? `Email sent to ${ctx.input.to.join(', ')}.`
        : `Failed to send email: ${result.message}`
    };
  })
  .build();
