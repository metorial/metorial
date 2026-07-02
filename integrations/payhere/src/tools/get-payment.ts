import { SlateTool } from 'slates';
import { z } from 'zod';
import { PayhereClient } from '../lib/client';
import { spec } from '../spec';

export let getPayment = SlateTool.create(spec, {
  name: 'Get Payment',
  key: 'get_payment',
  description: `Fetch detailed information about a specific payment, including associated customer, subscription, and plan data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      paymentId: z.number().describe('ID of the payment to retrieve')
    })
  )
  .output(
    z.object({
      paymentId: z.number().describe('Payment identifier'),
      hashid: z.string(),
      reference: z.string().nullable().describe('Payment reference'),
      amount: z.number().describe('Payment amount'),
      formattedAmount: z.string().describe('Formatted amount with currency symbol'),
      currency: z.string().describe('Currency code'),
      refundAmount: z.number().describe('Amount already refunded'),
      amountPaid: z.number().describe('Net amount paid'),
      cardBrand: z.string().nullable().describe('Card brand used'),
      cardLast4: z.string().nullable().describe('Last 4 digits of card'),
      status: z.string().describe('Payment status'),
      success: z.boolean(),
      customer: z
        .object({
          customerId: z.number(),
          name: z.string(),
          email: z.string(),
          location: z.string().nullable()
        })
        .nullable()
        .describe('Customer who made the payment'),
      subscription: z
        .object({
          subscriptionId: z.number(),
          status: z.string(),
          billingInterval: z.string()
        })
        .nullable()
        .describe('Associated subscription if recurring'),
      plan: z
        .object({
          planId: z.number(),
          name: z.string(),
          price: z.string(),
          currency: z.string()
        })
        .nullable()
        .describe('Associated plan'),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayhereClient({ token: ctx.auth.token });

    let payment = await client.getPayment(ctx.input.paymentId);

    return {
      output: payment,
      message: `Payment **#${payment.paymentId}**: ${payment.formattedAmount} — status: **${payment.status}**${payment.customer ? ` from ${payment.customer.name}` : ''}.`
    };
  })
  .build();
