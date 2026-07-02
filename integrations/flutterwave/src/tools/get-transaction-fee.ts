import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTransactionFee = SlateTool.create(spec, {
  name: 'Get Transaction Fee',
  key: 'get_transaction_fee',
  description: `Calculate the fees that will be charged for a transaction of a given amount and currency. Also supports checking transfer/payout fees. Useful for displaying fee breakdowns to customers before payment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      amount: z.number().describe('Transaction amount to calculate fees for'),
      currency: z.string().describe('Currency code (e.g. NGN, USD, GHS)'),
      feeType: z
        .enum(['transaction', 'transfer'])
        .optional()
        .describe('Type of fee to check (defaults to transaction)')
    })
  )
  .output(
    z.object({
      chargeAmount: z.number().optional().describe('Total charge amount'),
      fee: z.number().describe('Total fee amount'),
      flutterwaveFee: z.number().optional().describe('Flutterwave platform fee'),
      merchantFee: z.number().optional().describe('Merchant fee'),
      stampDutyFee: z.number().optional().describe('Stamp duty fee'),
      currency: z.string().describe('Fee currency')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.feeType === 'transfer') {
      let result = await client.getTransferFee(ctx.input.amount, ctx.input.currency);
      let feeData = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: {
          fee: feeData.fee,
          currency: feeData.currency
        },
        message: `Transfer fee for ${ctx.input.currency} ${ctx.input.amount}: **${feeData.currency} ${feeData.fee}**.`
      };
    }

    let result = await client.getTransactionFee(ctx.input.amount, ctx.input.currency);
    let d = result.data;

    return {
      output: {
        chargeAmount: d.charge_amount,
        fee: d.fee,
        flutterwaveFee: d.flutterwave_fee,
        merchantFee: d.merchant_fee,
        stampDutyFee: d.stamp_duty_fee,
        currency: d.currency
      },
      message: `Fee for ${d.currency} ${d.charge_amount}: **${d.currency} ${d.fee}** (Flutterwave: ${d.flutterwave_fee}, Stamp duty: ${d.stamp_duty_fee}).`
    };
  })
  .build();
