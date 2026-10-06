import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendLeadEmail = SlateTool.create(spec, {
  name: 'Send Lead Email',
  key: 'send_lead_email',
  description: `Send an email to a lead using either a pre-defined email template or custom content. Requires a connected inbox for the sending user. Template variables are auto-populated from lead fields when using a template.`,
  instructions: [
    'Provide either templateId for template-based emails, or both subject and body for custom emails.',
    'The sending user must have a connected inbox. Custom emails require API-key authentication. Template emails require the Dreamteam Edition. Email sending is asynchronous.'
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
      sent: z.boolean().describe('Whether the email request was accepted for sending'),
      leadId: z.number().describe('ID of the lead')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    let userId = ctx.input.userId ?? ctx.auth.userId;
    if (userId === undefined) {
      throw createApiServiceError(
        'Provide userId of a sender with a connected inbox. Use list_users to discover users.'
      );
    }
    if (
      ctx.input.templateId !== undefined &&
      (ctx.input.subject !== undefined || ctx.input.body !== undefined)
    ) {
      throw createApiServiceError('Use templateId or subject and body, not both email modes.');
    }
    if (ctx.input.templateId !== undefined) {
      await client.sendLeadEmail(ctx.input.leadId, {
        templateId: ctx.input.templateId,
        userId
      });
    } else if (ctx.input.subject && ctx.input.body) {
      if (ctx.auth.tokenType === 'user_token') {
        throw createApiServiceError(
          'Custom emails require an API-key connection. Use templateId with a user-token connection.'
        );
      }
      await client.sendLeadCustomEmail(ctx.input.leadId, {
        subject: ctx.input.subject,
        body: ctx.input.body,
        userId
      });
    } else {
      throw createApiServiceError(
        'Provide either templateId for a template email, or both subject and body for a custom email.'
      );
    }

    return {
      output: {
        sent: true,
        leadId: ctx.input.leadId
      },
      message: `Email sending requested for lead ${ctx.input.leadId}${ctx.input.templateId ? ` using template ${ctx.input.templateId}` : ' with custom content'}.`
    };
  })
  .build();
