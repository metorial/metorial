import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let emailInvoice = SlateTool.create(spec, {
  name: 'Email Invoice',
  key: 'email_invoice',
  description: `Send an invoice to a recipient via email. The invoice must exist and have a valid status. You can customise the email subject, body, and recipients, or use the saved email template.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('The FreeAgent invoice ID to email'),
      to: z.string().describe('Recipient email address'),
      from: z.string().optional().describe('Sender email address'),
      subject: z.string().optional().describe('Email subject line'),
      body: z.string().optional().describe('Email body text'),
      useTemplate: z
        .boolean()
        .optional()
        .describe('Use the saved email template instead of custom subject/body'),
      emailToSender: z.boolean().optional().describe('Send a copy to the sender')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the email was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let emailParams: Record<string, any> = {
      email: {
        to: ctx.input.to
      }
    };
    if (ctx.input.from) emailParams.email.from = ctx.input.from;
    if (ctx.input.subject) emailParams.email.subject = ctx.input.subject;
    if (ctx.input.body) emailParams.email.body = ctx.input.body;
    if (ctx.input.useTemplate) emailParams.email.use_template = ctx.input.useTemplate;
    if (ctx.input.emailToSender !== undefined)
      emailParams.email.email_to_sender = ctx.input.emailToSender;

    await client.emailInvoice(ctx.input.invoiceId, emailParams);

    return {
      output: { sent: true },
      message: `Emailed invoice **${ctx.input.invoiceId}** to **${ctx.input.to}**`
    };
  })
  .build();
