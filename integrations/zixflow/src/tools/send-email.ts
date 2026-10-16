import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { operationOutput, requireInput } from '../lib/response';
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
      reportUrl: z.string().optional().describe('URL to receive provider delivery reports'),
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
      raw: z.unknown().optional().describe('Complete response returned by Zixflow'),
      messageId: z.string().optional().describe('Message ID when returned by Zixflow'),
      campaignId: z.string().optional().describe('Campaign ID when returned by Zixflow'),
      success: z
        .boolean()
        .describe('Whether Zixflow acknowledged successful email submission'),
      responseMessage: z.string().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZixflowClient({ token: ctx.auth.token });

    if (ctx.input.to.length < 1 || ctx.input.to.length > 10)
      throw createApiServiceError('Provide between 1 and 10 recipients.', {
        reason: 'zixflow_invalid_input'
      });
    if (!ctx.input.bodyHtml && !ctx.input.bodyText)
      throw createApiServiceError('Provide bodyHtml or bodyText.', {
        reason: 'zixflow_invalid_input'
      });
    requireInput(ctx.input.fromEmail, 'fromEmail');
    let result = await client.sendEmail({
      reportUrl: ctx.input.reportUrl,
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
        ...operationOutput(result),
        messageId: typeof result.messageId === 'string' ? result.messageId : undefined,
        campaignId: typeof result.campaignId === 'string' ? result.campaignId : undefined
      },
      message:
        'Zixflow accepted the message request; use a delivery report to check recipient delivery.'
    };
  })
  .build();
