import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
    let client = new Client({ token: ctx.auth.token });

    let payment = await client.getPayment(ctx.input.paymentId);

    let paymentItems = (payment.paymentItems || []).map((item: any) => ({
      paymentItemType: item.paymentItemType,
      postingDate: item.postingDate,
      amount: item.amount,
      currency: item.currency
    }));

    let output = {
      openAmount: payment.openAmount,
      currency: payment.currency,
      paymentStatus: payment.paymentStatus,
      voucherType: payment.voucherType,
      voucherStatus: payment.voucherStatus,
      paidDate: payment.paidDate,
      paymentItems
    };

    let statusMessage =
      payment.openAmount === 0
        ? `Fully paid${payment.paidDate ? ` on ${payment.paidDate}` : ''}`
        : `Open amount: **${payment.openAmount} ${payment.currency || ''}**`;

    return {
      output,
      message: `Payment for ${payment.voucherType || 'voucher'} — ${statusMessage}, status: **${payment.paymentStatus || payment.voucherStatus}**, ${paymentItems.length} payment item(s).`
    };
  })
  .build();
