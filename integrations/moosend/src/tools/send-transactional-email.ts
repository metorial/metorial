import { createApiServiceError, getBase64ByteLength, SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { email, optionalNumber, text } from '../lib/data';
import { spec } from '../spec';

let recipientSchema = z.object({
  email: z.string().describe('Recipient email address'),
  name: z.string().optional().describe('Recipient name')
});

let personalizationSchema = z.object({
  to: z.array(recipientSchema).min(1).describe('Recipients for this personalization'),
  substitutions: z
    .record(z.string(), z.string())
    .optional()
    .describe('Key-value pairs for template variable substitution')
});

let attachmentSchema = z.object({
  type: z.string().describe('MIME type of the attachment (e.g. "application/pdf")'),
  fileName: z.string().describe('Filename for the attachment'),
  content: z.string().describe('Base64-encoded file content'),
  disposition: z
    .enum(['attachment', 'inline'])
    .optional()
    .describe('Default attachment; inline requires contentId'),
  contentId: z.string().optional().describe('Content ID used by inline HTML images')
});

export let sendTransactionalEmail = SlateTool.create(spec, {
  name: 'Send Transactional Email',
  key: 'send_transactional_email',
  description: `Send transactional emails such as order confirmations, password resets, shipping updates, or appointment reminders. Supports template-based sending with dynamic variable substitution and file attachments.`,
  instructions: [
    'Provide either a templateId (existing campaign ID), templateName (to match or create), or inline HTML content.',
    'Use substitutions in personalizations to replace template variables with dynamic values.',
    'The complete payload must be smaller than 20MB; content is limited to 1MB.'
  ],
  constraints: [
    'Requires transactional sending enabled for the account.',
    'The complete payload must be smaller than 20MB.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      fromEmail: z.string().describe('Sender email address'),
      fromName: z.string().optional().describe('Sender display name'),
      replyToEmail: z.string().optional().describe('Reply-to email address'),
      replyToName: z.string().optional().describe('Reply-to display name'),
      subject: z.string().describe('Email subject line'),
      templateId: z
        .string()
        .optional()
        .describe('ID of an existing transactional campaign template to use'),
      templateName: z
        .string()
        .optional()
        .describe('Template name to match an existing campaign or create a new one'),
      htmlContent: z.string().optional().describe('Inline HTML email content'),
      webLocation: z.string().optional().describe('URL to retrieve HTML content from'),
      personalizations: z
        .array(personalizationSchema)
        .min(1)
        .describe(
          'Array of personalizations, each with recipients and optional variable substitutions'
        ),
      attachments: z
        .array(attachmentSchema)
        .optional()
        .describe('File attachments (base64-encoded)'),
      bypassUnsubscribeManagement: z
        .boolean()
        .optional()
        .default(false)
        .describe('Bypass unsubscribe management for this send')
    })
  )
  .output(
    z.object({
      success: z
        .boolean()
        .describe(
          'Whether all requested recipients were accepted; acceptance does not prove delivery'
        ),
      recipientCount: z
        .number()
        .describe('Total number of requested recipients across all personalizations'),
      acceptedCount: z.number().optional().describe('Recipients accepted by the provider'),
      excludedCount: z.number().optional().describe('Recipients excluded by the provider')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoosendClient({ token: ctx.auth.token });

    if (
      !ctx.input.templateId &&
      !ctx.input.templateName &&
      !ctx.input.htmlContent &&
      !ctx.input.webLocation
    )
      throw createApiServiceError('Provide a template or inline/web content.');
    if (ctx.input.htmlContent && ctx.input.webLocation)
      throw createApiServiceError('Provide only one content source.');
    if (
      ctx.input.htmlContent !== undefined &&
      Buffer.byteLength(ctx.input.htmlContent, 'utf8') > 1_000_000
    )
      throw createApiServiceError('HTML content must not exceed 1MB.');
    let body: Record<string, unknown> = {
      From: {
        Email: email(ctx.input.fromEmail, 'verified sender email'),
        ...(ctx.input.fromName ? { Name: ctx.input.fromName } : {})
      },
      Subject: text(ctx.input.subject, 'subject'),
      Personalizations: ctx.input.personalizations.map(p => ({
        To: p.to.map(r => ({
          Email: email(r.email, 'recipient email'),
          ...(r.name ? { Name: r.name } : {})
        })),
        ...(p.substitutions ? { Substitutions: p.substitutions } : {})
      }))
    };

    if (ctx.input.replyToEmail) {
      body.ReplyTo = {
        Email: email(ctx.input.replyToEmail, 'reply-to email'),
        ...(ctx.input.replyToName ? { Name: ctx.input.replyToName } : {})
      };
    }

    if (ctx.input.templateId) body.TemplateId = ctx.input.templateId;
    if (ctx.input.templateName) body.TemplateName = ctx.input.templateName;

    if (ctx.input.htmlContent || ctx.input.webLocation) {
      body.Content = [
        {
          Type: 'text/html',
          ...(ctx.input.htmlContent ? { Value: ctx.input.htmlContent } : {}),
          ...(ctx.input.webLocation ? { WebLocation: ctx.input.webLocation } : {})
        }
      ];
    }

    if (ctx.input.attachments) {
      body.Attachments = ctx.input.attachments.map(a => {
        if (
          !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
            a.content
          ) ||
          getBase64ByteLength(a.content) === 0
        )
          throw createApiServiceError('Provide valid non-empty base64 file content.');
        if (a.disposition === 'inline' && !a.contentId)
          throw createApiServiceError('Inline files require contentId.');
        return {
          Type: text(a.type, 'file MIME type'),
          FileName: text(a.fileName, 'filename'),
          Content: a.content,
          Disposition: a.disposition ?? 'attachment',
          ...(a.contentId !== undefined ? { ContentId: text(a.contentId, 'content ID') } : {})
        };
      });
    }

    body.MailSettings = {
      BypassUnsubscribeManagement: { Enable: ctx.input.bypassUnsubscribeManagement ?? false }
    };
    if (Buffer.byteLength(JSON.stringify(body), 'utf8') >= 20_000_000)
      throw createApiServiceError('The complete request must be smaller than 20MB.');

    const receipt = await client.sendTransactionalEmail(body);
    const acceptedCount = optionalNumber(receipt.TotalAccepted);
    const excludedCount = optionalNumber(receipt.TotalExcluded);
    if (
      acceptedCount === undefined ||
      excludedCount === undefined ||
      !Number.isSafeInteger(acceptedCount) ||
      !Number.isSafeInteger(excludedCount) ||
      acceptedCount < 0 ||
      excludedCount < 0
    )
      throw createApiServiceError(
        'Moosend returned an incomplete send receipt. Verify provider state before retrying; the request was not repeated.',
        { reason: 'moosend_send_receipt_invalid' }
      );

    let recipientCount = ctx.input.personalizations.reduce((sum, p) => sum + p.to.length, 0);

    return {
      output: {
        success: excludedCount === 0 && acceptedCount === recipientCount,
        acceptedCount,
        excludedCount,
        recipientCount
      },
      message: `Moosend accepted **${acceptedCount}** recipient(s) and excluded **${excludedCount}**. This confirms acceptance, not delivery; inspect the result before retrying.`
    };
  })
  .build();
