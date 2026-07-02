import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
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
  content: z.string().describe('Base64-encoded file content')
});

export let sendTransactionalEmail = SlateTool.create(spec, {
  name: 'Send Transactional Email',
  key: 'send_transactional_email',
  description: `Send transactional emails such as order confirmations, password resets, shipping updates, or appointment reminders. Supports template-based sending with dynamic variable substitution and file attachments. Can send up to 50 personalized emails in a single request.`,
  instructions: [
    'Provide either a templateId (existing campaign ID), templateName (to match or create), or inline HTML content.',
    'Use substitutions in personalizations to replace template variables with dynamic values.',
    'Payload limit is 20MB per request. Up to 50 emails per request via the personalizations array.'
  ],
  constraints: [
    'Available on the Moosend+ plan as an add-on.',
    'Maximum 20MB payload per API call.',
    'Maximum 50 emails per request via personalizations.'
  ],
  tags: {
    destructive: false,
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
      success: z.boolean().describe('Whether the emails were sent successfully'),
      recipientCount: z
        .number()
        .describe('Total number of recipients across all personalizations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoosendClient({ token: ctx.auth.token });

    let body: Record<string, unknown> = {
      From: {
        Email: ctx.input.fromEmail,
        ...(ctx.input.fromName ? { Name: ctx.input.fromName } : {})
      },
      Subject: ctx.input.subject,
      Personalizations: ctx.input.personalizations.map(p => ({
        To: p.to.map(r => ({
          Email: r.email,
          ...(r.name ? { Name: r.name } : {})
        })),
        ...(p.substitutions ? { Substitutions: p.substitutions } : {})
      }))
    };

    if (ctx.input.replyToEmail) {
      body.ReplyTo = {
        Email: ctx.input.replyToEmail,
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
      body.Attachments = ctx.input.attachments.map(a => ({
        Type: a.type,
        FileName: a.fileName,
        Content: a.content
      }));
    }

    if (ctx.input.bypassUnsubscribeManagement) {
      body.MailSettings = { BypassUnsubscribeManagement: true };
    }

    await client.sendTransactionalEmail(body);

    let recipientCount = ctx.input.personalizations.reduce((sum, p) => sum + p.to.length, 0);

    return {
      output: {
        success: true,
        recipientCount
      },
      message: `Sent transactional email to **${recipientCount}** recipient(s) with subject "${ctx.input.subject}".`
    };
  })
  .build();
