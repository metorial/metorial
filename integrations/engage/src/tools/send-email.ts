import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Transactional Email',
  key: 'send_email',
  description: `Sends a transactional email through Engage or a connected Email Service Provider (ESP). Supports HTML content, plain text, or pre-built templates with variable substitution. Useful for password resets, activity notifications, receipts, and other programmatic emails.`,
  instructions: [
    'Provide one of: html, text, or templateName. At least one is required.',
    'The sender email domain must match a domain connected to Engage or registered with your ESP.',
    'Free accounts using Engage as ESP are limited to 100 transactional emails per day.'
  ],
  constraints: ['Free accounts: 100 transactional emails per day when using Engage as ESP.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fromEmail: z
        .string()
        .describe('Sender email address (domain must be connected to Engage or ESP)'),
      fromName: z.string().optional().describe('Sender display name'),
      to: z.union([z.string(), z.array(z.string())]).describe('Recipient email address(es)'),
      subject: z.string().describe('Email subject line'),
      html: z.string().optional().describe('HTML email content'),
      text: z.string().optional().describe('Plain text email content'),
      templateName: z
        .string()
        .optional()
        .describe('Template name/ID from Engage dashboard or ESP'),
      templateVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs for template placeholders'),
      cc: z.array(z.string()).optional().describe('CC recipient email addresses'),
      bcc: z.array(z.string()).optional().describe('BCC recipient email addresses'),
      replyTo: z.string().optional().describe('Reply-to email address'),
      trackClicks: z.boolean().optional().describe('Enable click tracking'),
      trackOpens: z.boolean().optional().describe('Enable open tracking')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the sent message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret
    });

    let result = await client.sendEmail({
      from: {
        email: ctx.input.fromEmail,
        name: ctx.input.fromName
      },
      to: ctx.input.to,
      subject: ctx.input.subject,
      html: ctx.input.html,
      text: ctx.input.text,
      template: ctx.input.templateName,
      templateVariables: ctx.input.templateVariables as Record<string, string> | undefined,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      replyTo: ctx.input.replyTo,
      trackClicks: ctx.input.trackClicks,
      trackOpens: ctx.input.trackOpens
    });

    return {
      output: {
        messageId: result.id
      },
      message: `Sent email to **${Array.isArray(ctx.input.to) ? ctx.input.to.join(', ') : ctx.input.to}** with subject **"${ctx.input.subject}"** (ID: ${result.id}).`
    };
  })
  .build();
