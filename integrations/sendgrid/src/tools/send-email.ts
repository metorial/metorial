import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailAddressSchema = z.object({
  email: z.string().describe('Email address'),
  name: z.string().optional().describe('Display name')
});

let personalizationSchema = z.object({
  to: z.array(emailAddressSchema).describe('Recipients for this personalization'),
  cc: z.array(emailAddressSchema).optional().describe('CC recipients'),
  bcc: z.array(emailAddressSchema).optional().describe('BCC recipients'),
  subject: z.string().optional().describe('Subject override for this personalization'),
  dynamicTemplateData: z
    .record(z.string(), z.any())
    .optional()
    .describe('Dynamic template data (Handlebars variables) for this personalization'),
  customArgs: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom arguments for analytics/tracking'),
  sendAt: z
    .number()
    .optional()
    .describe('Unix timestamp to schedule delivery for this personalization')
});

let attachmentSchema = z.object({
  content: z.string().describe('Base64-encoded content of the attachment'),
  filename: z.string().describe('Filename of the attachment'),
  type: z.string().optional().describe('MIME type (e.g. "application/pdf")'),
  disposition: z.enum(['attachment', 'inline']).optional().describe('Content disposition'),
  contentId: z.string().optional().describe('Content ID for inline attachments')
});

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send an email via SendGrid. Supports plain text, HTML, dynamic templates with Handlebars substitution, multiple recipients with personalizations, attachments, scheduling, and tracking settings. Each personalization can target different recipients with different dynamic data.`,
  instructions: [
    'Either provide **content** (text/HTML) or a **templateId** for dynamic templates, not both.',
    'When using a template, pass dynamic data via **personalizations[].dynamicTemplateData**.',
    'A top-level **subject** is required unless each personalization has its own subject or a template defines one.',
    'Attachments must be base64-encoded.'
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
      personalizations: z
        .array(personalizationSchema)
        .min(1)
        .describe('Array of personalizations, each targeting a set of recipients'),
      subject: z
        .string()
        .optional()
        .describe('Global email subject (can be overridden per personalization)'),
      textContent: z.string().optional().describe('Plain text email body'),
      htmlContent: z.string().optional().describe('HTML email body'),
      templateId: z
        .string()
        .optional()
        .describe('Dynamic template ID to use instead of inline content'),
      replyTo: emailAddressSchema.optional().describe('Reply-to address'),
      attachments: z.array(attachmentSchema).optional().describe('File attachments'),
      categories: z
        .array(z.string())
        .optional()
        .describe('Categories for email statistics grouping'),
      sendAt: z.number().optional().describe('Unix timestamp to schedule delivery'),
      batchId: z.string().optional().describe('Batch ID for grouping scheduled sends'),
      suppressionGroupId: z.number().optional().describe('Unsubscribe/suppression group ID'),
      sandboxMode: z
        .boolean()
        .optional()
        .describe('Enable sandbox mode to validate without sending'),
      clickTracking: z.boolean().optional().describe('Enable click tracking'),
      openTracking: z.boolean().optional().describe('Enable open tracking')
    })
  )
  .output(
    z.object({
      accepted: z.boolean().describe('Whether the email was accepted for delivery'),
      messageId: z.string().optional().describe('Message ID from SendGrid response headers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let content: Array<{ type: string; value: string }> | undefined;
    if (ctx.input.textContent || ctx.input.htmlContent) {
      content = [];
      if (ctx.input.textContent) {
        content.push({ type: 'text/plain', value: ctx.input.textContent });
      }
      if (ctx.input.htmlContent) {
        content.push({ type: 'text/html', value: ctx.input.htmlContent });
      }
    }

    let mailSettings: any;
    if (ctx.input.sandboxMode) {
      mailSettings = { sandboxMode: { enable: true } };
    }

    let trackingSettings: any;
    if (ctx.input.clickTracking !== undefined || ctx.input.openTracking !== undefined) {
      trackingSettings = {};
      if (ctx.input.clickTracking !== undefined) {
        trackingSettings.clickTracking = { enable: ctx.input.clickTracking };
      }
      if (ctx.input.openTracking !== undefined) {
        trackingSettings.openTracking = { enable: ctx.input.openTracking };
      }
    }

    let asm: any;
    if (ctx.input.suppressionGroupId) {
      asm = { groupId: ctx.input.suppressionGroupId };
    }

    let response = await client.sendEmail({
      personalizations: ctx.input.personalizations,
      from: ctx.input.from,
      replyTo: ctx.input.replyTo,
      subject: ctx.input.subject,
      content,
      attachments: ctx.input.attachments,
      templateId: ctx.input.templateId,
      categories: ctx.input.categories,
      sendAt: ctx.input.sendAt,
      batchId: ctx.input.batchId,
      asm,
      mailSettings,
      trackingSettings
    });

    let messageId = response.headers?.['x-message-id'] || undefined;

    let recipientCount = ctx.input.personalizations.reduce(
      (sum, p) => sum + p.to.length + (p.cc?.length || 0) + (p.bcc?.length || 0),
      0
    );

    return {
      output: {
        accepted: response.status === 202,
        messageId
      },
      message: `Email ${ctx.input.sandboxMode ? 'validated (sandbox mode)' : 'accepted for delivery'} to **${recipientCount}** recipient(s)${messageId ? ` with message ID \`${messageId}\`` : ''}.`
    };
  });
