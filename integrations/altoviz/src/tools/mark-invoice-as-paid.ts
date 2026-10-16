import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, requireBoolean } from '../lib/client';
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
        .describe(
          'Transfer, Order, Check, Cash, Card, Bill, Usec, or Other. Legacy BankTransfer and CreditCard aliases are accepted.'
        ),
      amount: z
        .number()
        .optional()
        .describe('Amount to pay; omit to pay the outstanding balance'),
      paymentReference: z.string().optional(),
      allowUpdate: z
        .boolean()
        .optional()
        .describe('Allow updating metadata/reference on an already paid invoice'),
      finalizationDate: z
        .string()
        .optional()
        .describe('Finalization date (YYYY-MM-DD), distinct from payment date'),
      dateAdjustment: z.enum(['None', 'MinimumDate', 'Today']).optional(),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata to store on the payment')
    })
  )
  .output(
    z.object({
      raw: z.record(z.string(), z.unknown()).optional(),
      invoiceId: z.number(),
      paid: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.markSaleInvoiceAsPaid(ctx.input);
    let paid = requireBoolean(result.isPaid, 'invoice paid state');

    return {
      output: {
        raw: result,
        invoiceId: result.id,
        paid
      },
      message: `Invoice **${ctx.input.invoiceId}** payment recorded on **${ctx.input.date}** via **${ctx.input.paymentMethod}**.`
    };
  })
  .build();
