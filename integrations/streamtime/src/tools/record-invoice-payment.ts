import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let recordInvoicePayment = SlateTool.create(spec, {
  name: 'Record Invoice Payment',
  key: 'record_invoice_payment',
  description: `Record a payment or payout against an existing invoice. Specify the amount, date, and optional reference.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('ID of the invoice to record payment against'),
      amount: z.number().describe('Payment amount'),
      date: z.string().optional().describe('Payment date (YYYY-MM-DD). Defaults to today.'),
      reference: z.string().optional().describe('Payment reference or note'),
      paymentAccountId: z.number().optional().describe('ID of the payment account')
    })
  )
  .output(
    z.object({
      paymentId: z.number().describe('ID of the recorded payment'),
      raw: z.record(z.string(), z.any()).describe('Full payment object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let body: Record<string, any> = {
      amount: ctx.input.amount
    };
    if (ctx.input.date !== undefined) body.date = ctx.input.date;
    if (ctx.input.reference !== undefined) body.reference = ctx.input.reference;
    if (ctx.input.paymentAccountId !== undefined)
      body.paymentAccountId = ctx.input.paymentAccountId;

    let result = await client.createInvoicePayment(ctx.input.invoiceId, body);

    return {
      output: {
        paymentId: result.id,
        raw: result
      },
      message: `Recorded payment of **${ctx.input.amount}** against invoice ${ctx.input.invoiceId}.`
    };
  })
  .build();
