import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let sendInvoiceEmail = SlateTool.create(spec, {
  name: 'Send Invoice Email',
  key: 'send_invoice_email',
  description: `Send an invoice to the client via email using Elorus. The email uses the default template configured for the document type. You can optionally customize the recipients.`
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      invoiceId: z.string().describe('The unique ID of the invoice to send.'),
      to: z
        .array(z.string())
        .optional()
        .describe('First address receives the email; additional addresses are carbon-copied.'),
      subject: z.string().optional().describe('Override email subject line.'),
      body: z.string().optional().describe('Override email body text.')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether Elorus accepted the email for sending.'),
      trackedEmail: z
        .any()
        .describe('Tracked email message including its ID and delivery status.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.input.organizationId ?? ctx.config.organizationId
    });

    let emailData: any = {};
    if (ctx.input.to?.length) {
      emailData.to = ctx.input.to[0];
      if (ctx.input.to.length > 1) emailData.cc = ctx.input.to.slice(1);
    }
    if (ctx.input.subject) emailData.subject = ctx.input.subject;
    if (ctx.input.body) emailData.message = ctx.input.body;

    let trackedEmail = await client.sendInvoiceEmail(ctx.input.invoiceId, emailData);

    return {
      output: { sent: true, trackedEmail },
      message: `Invoice **${ctx.input.invoiceId}** submitted for email delivery.`
    };
  })
  .build();
