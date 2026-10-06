import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { paymentAmount } from '../lib/validation';
import { spec } from '../spec';

let paymentItemSchema = z.object({
  paymentItemType: z.string().optional().describe('Type of the payment item'),
  postingDate: z.string().optional().describe('Posting date of the payment'),
  amount: z.number().optional().describe('Payment amount'),
  currency: z.string().optional().describe('Currency code')
});

export let getPayment = SlateTool.create(spec, {
  name: 'Get Payment',
  key: 'get_payment',
  description: `Retrieves payment information for a specific voucher from Lexoffice. Returns the open amount, payment status, payment items, and paid date. Use the voucher ID to look up its payment details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      paymentId: z.string().describe('The voucher ID to retrieve payment information for')
    })
  )
  .output(
    z.object({
      openAmountExact: z
        .string()
        .optional()
        .describe(
          'Exact decimal open amount; use this if the numeric value is omitted because it exceeds the safe range'
        ),
      openAmount: z.number().optional().describe('Remaining open amount'),
      currency: z.string().optional().describe('Currency code'),
      paymentStatus: z.string().optional().describe('Payment status of the voucher'),
      voucherType: z.string().optional().describe('Type of the associated voucher'),
      voucherStatus: z.string().optional().describe('Status of the associated voucher'),
      paidDate: z.string().optional().describe('Date the voucher was fully paid'),
      paymentItems: z.array(paymentItemSchema).optional().describe('Individual payment items')
    })
  )
  .handleInvocation(async ctx => {
    const payment = await new Client({ token: ctx.auth.token }).getPayment(
      ctx.input.paymentId
    );
    const amount = paymentAmount(payment.openAmount);
    const output = { ...payment, openAmount: amount.numeric, openAmountExact: amount.exact };
    return {
      output,
      message: `Payment status: **${payment.paymentStatus}**; open amount ${amount.exact}${payment.currency ? ` ${payment.currency}` : ''}. A balanced amount alone does not establish that a voucher was paid.`
    };
  })
  .build();
