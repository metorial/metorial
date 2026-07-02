import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let markInvoiceAsPaid = SlateTool.create(spec, {
  name: 'Mark Invoice as Paid',
  key: 'mark_invoice_as_paid',
  description: `Mark a sales invoice as paid in Altoviz. This finalizes the invoice (if not already finalized) and records the payment with a date and payment method. You can also attach metadata to the payment.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('Altoviz invoice ID'),
      date: z.string().describe('Payment date (YYYY-MM-DD)'),
      paymentMethod: z
        .string()
        .describe('Payment method (e.g. BankTransfer, CreditCard, Cash, Check)'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata to store on the payment')
    })
  )
  .output(
    z.object({
      invoiceId: z.number(),
      paid: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.markSaleInvoiceAsPaid({
      invoiceId: ctx.input.invoiceId,
      date: ctx.input.date,
      paymentMethod: ctx.input.paymentMethod,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        invoiceId: ctx.input.invoiceId,
        paid: true
      },
      message: `Invoice **${ctx.input.invoiceId}** marked as paid on **${ctx.input.date}** via **${ctx.input.paymentMethod}**.`
    };
  })
  .build();
