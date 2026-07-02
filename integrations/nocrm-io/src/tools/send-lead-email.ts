import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendLeadEmail = SlateTool.create(spec, {
  name: 'Send Lead Email',
  key: 'send_lead_email',
  description: `Send an email to a lead using either a pre-defined email template or custom content. Requires a connected inbox for the sending user. Template variables are auto-populated from lead fields when using a template.`,
  instructions: [
    'Provide either templateId for template-based emails, or both subject and body for custom emails.',
    'The sending user must have a connected inbox.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to email'),
      templateId: z
        .number()
        .optional()
        .describe('Email template ID (for template-based emails)'),
      subject: z.string().optional().describe('Email subject (for custom emails)'),
      body: z.string().optional().describe('Email body HTML/text (for custom emails)'),
      userId: z
        .number()
        .optional()
        .describe('User ID of the sender (must have a connected inbox)')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the email was sent successfully'),
      leadId: z.number().describe('ID of the lead')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    if (ctx.input.templateId) {
      await client.sendLeadEmail(ctx.input.leadId, {
        templateId: ctx.input.templateId,
        userId: ctx.input.userId
      });
    } else if (ctx.input.subject && ctx.input.body) {
      await client.sendLeadCustomEmail(ctx.input.leadId, {
        subject: ctx.input.subject,
        body: ctx.input.body,
        userId: ctx.input.userId
      });
    } else {
      throw new Error(
        'Provide either templateId for a template email, or both subject and body for a custom email.'
      );
    }

    return {
      output: {
        sent: true,
        leadId: ctx.input.leadId
      },
      message: `Email sent to lead ${ctx.input.leadId}${ctx.input.templateId ? ` using template ${ctx.input.templateId}` : ' with custom content'}.`
    };
  })
  .build();
