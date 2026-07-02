import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendTransactionalEmail = SlateTool.create(spec, {
  name: 'Send Transactional Email',
  key: 'send_transactional_email',
  description: `Sends a transactional email via Sender. Supports two modes: send directly with custom content (subject, HTML/text body), or send using a pre-built campaign template by providing a campaignId. Supports personalization variables (Liquid syntax), attachments via public URLs, and custom headers.`,
  instructions: [
    'When using a campaign template, provide the campaignId and the content from the template will be used. You can still override text/html content.',
    'Attachments must be publicly accessible HTTPS URLs. Max 10MB per attachment.',
    'Variables use Liquid template syntax for personalization.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .optional()
        .describe(
          'Campaign template ID. If provided, sends using this template. Otherwise sends a custom email.'
        ),
      fromEmail: z
        .string()
        .optional()
        .describe(
          'Sender email address (must be from a verified domain). Required when not using a campaign template.'
        ),
      fromName: z
        .string()
        .optional()
        .describe('Sender display name. Required when not using a campaign template.'),
      toEmail: z.string().describe('Recipient email address'),
      toName: z.string().optional().describe('Recipient display name'),
      subject: z
        .string()
        .optional()
        .describe('Email subject line. Required when not using a campaign template.'),
      html: z.string().optional().describe('HTML email body'),
      text: z.string().optional().describe('Plain text email body'),
      variables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Personalization variables for Liquid template tags'),
      attachments: z
        .record(z.string(), z.string())
        .optional()
        .describe('Attachments as key-value pairs (filename: public HTTPS URL)')
    })
  )
  .output(
    z.object({
      emailId: z.string().describe('Unique identifier for the sent email'),
      success: z.boolean().describe('Whether the email was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.campaignId) {
      let result = await client.sendTransactionalCampaign(ctx.input.campaignId, {
        to: { email: ctx.input.toEmail, name: ctx.input.toName },
        variables: ctx.input.variables,
        attachments: ctx.input.attachments,
        text: ctx.input.text,
        html: ctx.input.html
      });

      return {
        output: {
          emailId: result.emailId,
          success: result.success
        },
        message: `Transactional email sent to **${ctx.input.toEmail}** using campaign template \`${ctx.input.campaignId}\`. Email ID: \`${result.emailId}\`.`
      };
    }

    if (!ctx.input.fromEmail || !ctx.input.fromName || !ctx.input.subject) {
      throw new Error(
        'fromEmail, fromName, and subject are required when not using a campaign template'
      );
    }

    let result = await client.sendTransactionalEmail({
      from: { email: ctx.input.fromEmail, name: ctx.input.fromName },
      to: { email: ctx.input.toEmail, name: ctx.input.toName },
      subject: ctx.input.subject,
      html: ctx.input.html,
      text: ctx.input.text,
      variables: ctx.input.variables,
      attachments: ctx.input.attachments
    });

    return {
      output: {
        emailId: result.emailId,
        success: result.success
      },
      message: `Transactional email sent to **${ctx.input.toEmail}** with subject "${ctx.input.subject}". Email ID: \`${result.emailId}\`.`
    };
  })
  .build();
