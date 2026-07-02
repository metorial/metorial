import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenSingleResource } from '../lib/helpers';
import { spec } from '../spec';

export let createPayment = SlateTool.create(spec, {
  name: 'Create Payment',
  key: 'create_payment',
  description: `Create a payment charge, authorization, or refund. Charges process direct payments, authorizations hold funds for later capture, and refunds return funds from previous charges.`,
  instructions: [
    'For charges: provide orderId and amountInCents at minimum.',
    'For refunds: provide orderId and amountInCents for the refund amount.',
    'For authorizations: provide orderId and amountInCents for the hold amount.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      paymentType: z
        .enum(['charge', 'authorization', 'refund'])
        .describe('Type of payment to create'),
      orderId: z.string().describe('Order ID to associate the payment with'),
      amountInCents: z.number().describe('Amount in cents'),
      mode: z
        .enum(['manual', 'off_session', 'request', 'terminal', 'capture'])
        .optional()
        .describe('Payment mode (for charges)'),
      paymentMethodId: z.string().optional().describe('Saved payment method ID'),
      provider: z.enum(['stripe', 'app', 'none']).optional().describe('Payment provider')
    })
  )
  .output(
    z.object({
      payment: z.record(z.string(), z.any()).describe('The created payment record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    let attributes: Record<string, any> = {
      order_id: ctx.input.orderId,
      amount_in_cents: ctx.input.amountInCents
    };

    if (ctx.input.mode) attributes.mode = ctx.input.mode;
    if (ctx.input.paymentMethodId) attributes.payment_method_id = ctx.input.paymentMethodId;
    if (ctx.input.provider) attributes.provider = ctx.input.provider;

    let response: any;
    if (ctx.input.paymentType === 'charge') {
      response = await client.createPaymentCharge(attributes);
    } else if (ctx.input.paymentType === 'authorization') {
      response = await client.createPaymentAuthorization(attributes);
    } else {
      response = await client.createPaymentRefund(attributes);
    }

    let payment = flattenSingleResource(response);

    return {
      output: { payment },
      message: `Created payment ${ctx.input.paymentType} for **${ctx.input.amountInCents / 100}** on order ${ctx.input.orderId}.`
    };
  })
  .build();
