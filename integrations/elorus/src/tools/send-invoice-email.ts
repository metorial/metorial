import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendInvoiceEmail = SlateTool.create(spec, {
  name: 'Send Invoice Email',
  key: 'send_invoice_email',
  description: `Send an invoice to the client via email using Elorus. The email uses the default template configured for the document type. You can optionally customize the recipients.`
})
  .input(
    z.object({
      invoiceId: z.string().describe('The unique ID of the invoice to send.'),
      to: z.array(z.string()).optional().describe('Override recipient email addresses.'),
      subject: z.string().optional().describe('Override email subject line.'),
      body: z.string().optional().describe('Override email body text.')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the email was sent successfully.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let emailData: any = {};
    if (ctx.input.to) emailData.to = ctx.input.to;
    if (ctx.input.subject) emailData.subject = ctx.input.subject;
    if (ctx.input.body) emailData.body = ctx.input.body;

    await client.sendInvoiceEmail(ctx.input.invoiceId, emailData);

    return {
      output: { sent: true },
      message: `Invoice **${ctx.input.invoiceId}** sent via email.`
    };
  })
  .build();
