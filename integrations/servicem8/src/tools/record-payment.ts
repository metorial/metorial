import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recordPayment = SlateTool.create(spec, {
  name: 'Record Payment',
  key: 'record_payment',
  description: `Record a payment against a job in ServiceM8. Specify the job, payment amount, and optionally the payment method. Returns the UUID of the created payment record.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      jobUuid: z.string().describe('UUID of the job to record the payment against'),
      amount: z.string().describe('Payment amount (decimal value, e.g. "150.00")'),
      paymentMethod: z
        .string()
        .optional()
        .describe('Payment method (e.g. "Cash", "Card", "EFT")'),
      paymentDate: z
        .string()
        .optional()
        .describe('Payment date (YYYY-MM-DD). Defaults to today.')
    })
  )
  .output(
    z.object({
      paymentUuid: z.string().describe('UUID of the created payment record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {
      job_uuid: ctx.input.jobUuid,
      amount: ctx.input.amount
    };
    if (ctx.input.paymentMethod) data.payment_method = ctx.input.paymentMethod;
    if (ctx.input.paymentDate) data.payment_date = ctx.input.paymentDate;

    let paymentUuid = await client.createJobPayment(data);

    return {
      output: { paymentUuid },
      message: `Recorded payment of **$${ctx.input.amount}** on job **${ctx.input.jobUuid}**${ctx.input.paymentMethod ? ` via ${ctx.input.paymentMethod}` : ''}.`
    };
  })
  .build();
