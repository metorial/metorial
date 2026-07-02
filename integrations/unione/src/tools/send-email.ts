import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z.object({
  email: z.string().describe('Recipient email address'),
  substitutions: z
    .record(z.string(), z.string())
    .optional()
    .describe('Per-recipient substitutions/merge tags'),
  metadata: z
    .record(z.string(), z.string())
    .optional()
    .describe('Per-recipient metadata (max 10 key-value pairs)')
});

let attachmentSchema = z.object({
  type: z.string().describe('MIME type of the attachment (e.g., "application/pdf")'),
  name: z.string().describe('Filename of the attachment'),
  content: z.string().describe('Base64-encoded content of the attachment')
});

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send transactional or marketing emails to one or more recipients. Supports HTML, plaintext, and AMP email bodies with per-recipient personalization through substitutions/merge tags.
Can reference a stored template by ID, include attachments, schedule delivery up to 24 hours ahead, and track opens/clicks.`,
  instructions: [
    'Provide at least one recipient. Up to 500 recipients are allowed per request.',
    'Either provide email body content (html/plaintext) or a templateId to use a stored template.',
    'Use substitutions for personalization. Global substitutions apply to all recipients; per-recipient substitutions override globals.',
    'An idempotenceKey prevents duplicate sends within a one-minute window.'
  ],
  constraints: [
    'Maximum 500 recipients per request.',
    'Maximum 10MB total request size.',
    'Scheduling is limited to 24 hours in advance.',
    'Attachments must be base64-encoded, max 7MB each.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      recipients: z.array(recipientSchema).min(1).describe('List of email recipients (1-500)'),
      templateId: z.string().optional().describe('UUID of a stored template to use'),
      templateEngine: z
        .enum(['simple', 'velocity', 'liquid', 'none'])
        .optional()
        .describe('Template engine for substitutions'),
      subject: z.string().optional().describe('Email subject line (required if no template)'),
      fromEmail: z
        .string()
        .optional()
        .describe('Sender email address (required if no template)'),
      fromName: z.string().optional().describe('Sender display name'),
      replyTo: z.string().optional().describe('Reply-to email address'),
      replyToName: z.string().optional().describe('Reply-to display name'),
      html: z.string().optional().describe('HTML email body'),
      plaintext: z.string().optional().describe('Plaintext email body'),
      amp: z.string().optional().describe('AMP HTML email body'),
      globalSubstitutions: z
        .record(z.string(), z.string())
        .optional()
        .describe('Substitutions applied to all recipients'),
      globalMetadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Metadata attached to the email (max 10 key-value pairs)'),
      tags: z.array(z.string()).optional().describe('Tags for categorizing the email (max 4)'),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom email headers (most require "X-" prefix)'),
      attachments: z.array(attachmentSchema).optional().describe('File attachments'),
      inlineAttachments: z
        .array(attachmentSchema)
        .optional()
        .describe('Inline image attachments referenced via content IDs'),
      trackLinks: z.boolean().optional().describe('Enable click tracking (default: true)'),
      trackRead: z.boolean().optional().describe('Enable open/read tracking (default: true)'),
      sendAt: z
        .string()
        .optional()
        .describe('Schedule delivery time (ISO 8601 format, up to 24 hours ahead)'),
      idempotenceKey: z
        .string()
        .optional()
        .describe('Key to prevent duplicate sends within a one-minute window'),
      skipUnsubscribe: z
        .boolean()
        .optional()
        .describe('Skip appending unsubscribe link (requires support approval)'),
      bypassGlobal: z.boolean().optional().describe('Bypass global unavailability list'),
      bypassUnavailable: z.boolean().optional().describe('Bypass unavailable addresses'),
      bypassUnsubscribed: z.boolean().optional().describe('Bypass unsubscribed addresses'),
      bypassComplained: z.boolean().optional().describe('Bypass complained addresses')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Job ID for tracking the email delivery'),
      acceptedEmails: z
        .array(z.string())
        .describe('List of accepted recipient email addresses'),
      failedEmails: z
        .record(z.string(), z.string())
        .optional()
        .describe('Map of rejected emails to rejection reasons')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let message: Record<string, unknown> = {
      recipients: ctx.input.recipients.map(r => ({
        email: r.email,
        substitutions: r.substitutions,
        metadata: r.metadata
      }))
    };

    if (ctx.input.templateId) message.template_id = ctx.input.templateId;
    if (ctx.input.templateEngine) message.template_engine = ctx.input.templateEngine;
    if (ctx.input.subject) message.subject = ctx.input.subject;
    if (ctx.input.fromEmail) message.from_email = ctx.input.fromEmail;
    if (ctx.input.fromName) message.from_name = ctx.input.fromName;
    if (ctx.input.replyTo) message.reply_to = ctx.input.replyTo;
    if (ctx.input.replyToName) message.reply_to_name = ctx.input.replyToName;
    if (ctx.input.globalSubstitutions)
      message.global_substitutions = ctx.input.globalSubstitutions;
    if (ctx.input.globalMetadata) message.global_metadata = ctx.input.globalMetadata;
    if (ctx.input.tags) message.tags = ctx.input.tags;
    if (ctx.input.headers) message.headers = ctx.input.headers;
    if (ctx.input.attachments) message.attachments = ctx.input.attachments;
    if (ctx.input.inlineAttachments) message.inline_attachments = ctx.input.inlineAttachments;

    if (ctx.input.html || ctx.input.plaintext || ctx.input.amp) {
      let body: Record<string, string> = {};
      if (ctx.input.html) body.html = ctx.input.html;
      if (ctx.input.plaintext) body.plaintext = ctx.input.plaintext;
      if (ctx.input.amp) body.amp = ctx.input.amp;
      message.body = body;
    }

    if (ctx.input.trackLinks !== undefined) message.track_links = ctx.input.trackLinks ? 1 : 0;
    if (ctx.input.trackRead !== undefined) message.track_read = ctx.input.trackRead ? 1 : 0;
    if (ctx.input.skipUnsubscribe !== undefined)
      message.skip_unsubscribe = ctx.input.skipUnsubscribe ? 1 : 0;
    if (ctx.input.bypassGlobal !== undefined)
      message.bypass_global = ctx.input.bypassGlobal ? 1 : 0;
    if (ctx.input.bypassUnavailable !== undefined)
      message.bypass_unavailable = ctx.input.bypassUnavailable ? 1 : 0;
    if (ctx.input.bypassUnsubscribed !== undefined)
      message.bypass_unsubscribed = ctx.input.bypassUnsubscribed ? 1 : 0;
    if (ctx.input.bypassComplained !== undefined)
      message.bypass_complained = ctx.input.bypassComplained ? 1 : 0;

    if (ctx.input.sendAt) {
      message.options = { send_at: ctx.input.sendAt };
    }

    let result = await client.sendEmail(message as any);

    let failedCount = result.failed_emails ? Object.keys(result.failed_emails).length : 0;

    return {
      output: {
        jobId: result.job_id,
        acceptedEmails: result.emails ?? [],
        failedEmails: result.failed_emails
      },
      message: `Email sent with job ID **${result.job_id}**. ${result.emails?.length ?? 0} accepted, ${failedCount} failed.`
    };
  })
  .build();
