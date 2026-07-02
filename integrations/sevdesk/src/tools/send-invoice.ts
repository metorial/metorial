import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let sendInvoice = SlateTool.create(spec, {
  name: 'Send Invoice',
  key: 'send_invoice',
  description: `Send an invoice via email with the invoice PDF attached. Also marks the invoice as sent. Optionally send copies to CC/BCC addresses.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to send'),
      toEmail: z.string().describe('Recipient email address'),
      subject: z.string().describe('Email subject line'),
      text: z.string().describe('Email body text'),
      ccEmail: z.string().optional().describe('CC email address'),
      bccEmail: z.string().optional().describe('BCC email address'),
      sendCopy: z.boolean().optional().describe('Send a copy to the sender')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('ID of the sent invoice'),
      sent: z.boolean().describe('Whether the invoice was successfully sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    await client.sendInvoiceViaEmail(ctx.input.invoiceId, {
      toEmail: ctx.input.toEmail,
      subject: ctx.input.subject,
      text: ctx.input.text,
      copy: ctx.input.sendCopy,
      ccEmail: ctx.input.ccEmail,
      bccEmail: ctx.input.bccEmail
    });

    return {
      output: {
        invoiceId: ctx.input.invoiceId,
        sent: true
      },
      message: `Sent invoice **${ctx.input.invoiceId}** to **${ctx.input.toEmail}**.`
    };
  })
  .build();
