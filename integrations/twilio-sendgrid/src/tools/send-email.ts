import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailAddressSchema = z.object({
  email: z.string().describe('Email address'),
  name: z.string().optional().describe('Display name')
});

let personalizationSchema = z.object({
  to: z.array(emailAddressSchema).describe('Recipients'),
  cc: z.array(emailAddressSchema).optional().describe('CC recipients'),
  bcc: z.array(emailAddressSchema).optional().describe('BCC recipients'),
  subject: z.string().optional().describe('Subject override for this personalization'),
  dynamicTemplateData: z
    .record(z.string(), z.any())
    .optional()
    .describe('Dynamic template data for Handlebars substitution')
});

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send transactional or marketing emails via SendGrid. Supports personalizations for per-recipient customization, dynamic templates, attachments, and tracking settings. Use **templateId** to send using a pre-built dynamic template, or provide **content** directly with HTML/plain text.`,
  instructions: [
    'Either provide content (with type and value) or a templateId, but not both.',
    'When using a templateId, pass dynamicTemplateData in personalizations to populate template variables.',
    'Attachment content must be base64-encoded.'
  ],
  constraints: [
    'Maximum 1000 personalizations per request.',
    'Total message size (including attachments) must not exceed 30MB.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      from: emailAddressSchema.describe('Sender email address and optional name'),
      to: z
        .array(emailAddressSchema)
        .describe('Primary recipients (used if personalizations is not provided)'),
      subject: z.string().optional().describe('Email subject line'),
      textContent: z.string().optional().describe('Plain text email body'),
      htmlContent: z.string().optional().describe('HTML email body'),
      templateId: z
        .string()
        .optional()
        .describe('Dynamic template ID to use instead of inline content'),
      personalizations: z
        .array(personalizationSchema)
        .optional()
        .describe(
          'Advanced per-recipient customizations. If omitted, a single personalization is created from the top-level "to" field.'
        ),
      replyTo: emailAddressSchema.optional().describe('Reply-to address'),
      cc: z
        .array(emailAddressSchema)
        .optional()
        .describe('CC recipients (used when personalizations is not provided)'),
      bcc: z
        .array(emailAddressSchema)
        .optional()
        .describe('BCC recipients (used when personalizations is not provided)'),
      attachments: z
        .array(
          z.object({
            content: z.string().describe('Base64-encoded attachment content'),
            filename: z.string().describe('Attachment filename'),
            type: z.string().optional().describe('MIME type of the attachment'),
            disposition: z
              .enum(['attachment', 'inline'])
              .optional()
              .describe('Content disposition'),
            contentId: z.string().optional().describe('Content ID for inline attachments')
          })
        )
        .optional()
        .describe('File attachments'),
      categories: z.array(z.string()).optional().describe('Categories for email analytics'),
      customArgs: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom arguments included in webhook events'),
      sendAt: z.number().optional().describe('Unix timestamp for scheduled sending'),
      batchId: z.string().optional().describe('Batch ID for grouping scheduled sends'),
      asmGroupId: z
        .number()
        .optional()
        .describe('Unsubscribe group ID for suppression management'),
      asmGroupsToDisplay: z
        .array(z.number())
        .optional()
        .describe('Unsubscribe groups to display in the subscription management page'),
      ipPoolName: z.string().optional().describe('IP pool name to send from'),
      trackClicks: z.boolean().optional().describe('Enable click tracking'),
      trackOpens: z.boolean().optional().describe('Enable open tracking')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the email was accepted for delivery'),
      statusCode: z.number().describe('HTTP status code from SendGrid'),
      messageId: z.string().nullable().describe('Message ID assigned by SendGrid')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let personalizations = ctx.input.personalizations;
    if (!personalizations || personalizations.length === 0) {
      personalizations = [
        {
          to: ctx.input.to,
          cc: ctx.input.cc,
          bcc: ctx.input.bcc
        }
      ];
    }

    let content: Array<{ type: string; value: string }> | undefined;
    if (ctx.input.textContent || ctx.input.htmlContent) {
      content = [];
      if (ctx.input.textContent)
        content.push({ type: 'text/plain', value: ctx.input.textContent });
      if (ctx.input.htmlContent)
        content.push({ type: 'text/html', value: ctx.input.htmlContent });
    }

    let trackingSettings: any;
    if (ctx.input.trackClicks !== undefined || ctx.input.trackOpens !== undefined) {
      trackingSettings = {};
      if (ctx.input.trackClicks !== undefined) {
        trackingSettings.clickTracking = { enable: ctx.input.trackClicks };
      }
      if (ctx.input.trackOpens !== undefined) {
        trackingSettings.openTracking = { enable: ctx.input.trackOpens };
      }
    }

    let result = await client.sendEmail({
      personalizations,
      from: ctx.input.from,
      replyTo: ctx.input.replyTo,
      subject: ctx.input.subject,
      content,
      templateId: ctx.input.templateId,
      attachments: ctx.input.attachments,
      categories: ctx.input.categories,
      customArgs: ctx.input.customArgs,
      sendAt: ctx.input.sendAt,
      batchId: ctx.input.batchId,
      asmGroupId: ctx.input.asmGroupId,
      asmGroupsToDisplay: ctx.input.asmGroupsToDisplay,
      ipPoolName: ctx.input.ipPoolName,
      trackingSettings
    });

    let recipientCount = personalizations.reduce((sum, p) => sum + p.to.length, 0);

    return {
      output: {
        success: result.statusCode >= 200 && result.statusCode < 300,
        statusCode: result.statusCode,
        messageId: result.messageId
      },
      message: `Email sent to **${recipientCount}** recipient(s) from **${ctx.input.from.email}**${ctx.input.subject ? ` with subject "${ctx.input.subject}"` : ''}. Status: ${result.statusCode}.${result.messageId ? ` Message ID: ${result.messageId}` : ''}`
    };
  })
  .build();
