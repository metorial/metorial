import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendTransactionalEmail = SlateTool.create(spec, {
  name: 'Send Transactional Email',
  key: 'send_transactional_email',
  description: `Send a transactional email using either a pre-built template name or custom HTML. Supports recipient addressing (to, cc, bcc), placeholder replacements, and optional logging.`,
  instructions: [
    'Provide either a mailName (referencing a pre-built transactional template) or html content — at least one is required.',
    'Recipient addresses support the "Name <email>" format.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      mailName: z
        .string()
        .optional()
        .describe('Name of a pre-built transactional email template'),
      subject: z.string().optional().describe('Email subject line'),
      html: z.string().optional().describe('Custom HTML content for the email body'),
      from: z
        .string()
        .optional()
        .describe('Sender email address (supports "Name <email>" format)'),
      to: z.string().describe('Recipient email address (supports "Name <email>" format)'),
      cc: z.string().optional().describe('CC email address (supports "Name <email>" format)'),
      bcc: z
        .string()
        .optional()
        .describe('BCC email address (supports "Name <email>" format)'),
      replacements: z
        .record(z.string(), z.string())
        .optional()
        .describe('Placeholder replacements as key-value pairs'),
      store: z
        .boolean()
        .optional()
        .describe('Whether to store the email in the transactional log (defaults to true)'),
      fake: z
        .boolean()
        .optional()
        .describe('Simulate sending without actual delivery (for testing)'),
      mailer: z.string().optional().describe('Specific mailer service to use')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the email was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    await client.sendTransactionalEmail({
      mail_name: ctx.input.mailName,
      subject: ctx.input.subject,
      html: ctx.input.html,
      from: ctx.input.from,
      to: ctx.input.to,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      replacements: ctx.input.replacements,
      store: ctx.input.store,
      fake: ctx.input.fake,
      mailer: ctx.input.mailer
    });

    return {
      output: { success: true },
      message: `Transactional email sent to **${ctx.input.to}**${ctx.input.fake ? ' (simulated)' : ''}.`
    };
  });
