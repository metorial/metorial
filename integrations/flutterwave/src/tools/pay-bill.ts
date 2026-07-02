import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let payBill = SlateTool.create(spec, {
  name: 'Pay Bill',
  key: 'pay_bill',
  description: `Pay bills including Airtime, Data bundles, Cable TV (DSTV, GOtv), Power/Electricity, Tolls, and more. Requires the biller code, item code, and customer identifier. Use the "List Bill Categories" tool first to find valid biller and item codes.`,
  instructions: [
    'First use "List Bill Categories" to find the billerCode and itemCode.',
    'The customer field is the identifier for the bill (phone number for airtime, meter number for power, smartcard number for cable, etc.).'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      billerCode: z.string().describe('Biller code (e.g. BIL099 for MTN Nigeria)'),
      itemCode: z.string().describe('Bill item code (e.g. AT099 for MTN Airtime)'),
      country: z.string().describe('Country code (e.g. NG, GH, KE)'),
      customer: z
        .string()
        .describe('Customer identifier (phone number, meter number, smartcard number, etc.)'),
      amount: z.number().describe('Bill amount to pay'),
      type: z.string().describe('Bill type (AIRTIME, DATA, DSTV, GOTV, PHCN, etc.)'),
      recurrence: z
        .enum(['ONCE', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'])
        .optional()
        .describe('Payment recurrence schedule'),
      reference: z.string().optional().describe('Your unique reference for the payment')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Payment status'),
      message: z.string().describe('Response message from the provider'),
      reference: z.string().optional().describe('Payment reference')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createBillPayment(ctx.input.billerCode, ctx.input.itemCode, {
      country: ctx.input.country,
      customer: ctx.input.customer,
      amount: ctx.input.amount,
      type: ctx.input.type,
      recurrence: ctx.input.recurrence,
      reference: ctx.input.reference
    });

    return {
      output: {
        status: result.status,
        message: result.message,
        reference: result.data?.reference || result.data?.tx_ref
      },
      message: `Bill payment of **${ctx.input.amount}** for **${ctx.input.type}** to ${ctx.input.customer}: **${result.status}**.`
    };
  })
  .build();
