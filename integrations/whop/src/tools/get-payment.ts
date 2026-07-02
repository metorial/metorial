import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhopClient } from '../lib/client';
import { spec } from '../spec';

export let getPayment = SlateTool.create(spec, {
  name: 'Get Payment',
  key: 'get_payment',
  description: `Retrieve detailed information about a specific payment, including user, product, membership, payment method, and refund details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      paymentId: z.string().describe('Payment ID to retrieve')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('Unique payment identifier'),
      status: z.string().describe('Payment status'),
      substatus: z.string().nullable().describe('Payment substatus'),
      currency: z.string().describe('Currency code'),
      total: z.number().describe('Total payment amount'),
      subtotal: z.number().nullable().describe('Subtotal'),
      usdTotal: z.number().nullable().describe('Total in USD'),
      refundedAmount: z.number().describe('Refunded amount'),
      refundable: z.boolean().describe('Whether payment is refundable'),
      retryable: z.boolean().describe('Whether payment can be retried'),
      billingReason: z.string().nullable().describe('Billing reason'),
      userId: z.string().nullable().describe('User ID'),
      username: z.string().nullable().describe('Username'),
      userEmail: z.string().nullable().describe('User email'),
      productId: z.string().nullable().describe('Product ID'),
      productTitle: z.string().nullable().describe('Product title'),
      membershipId: z.string().nullable().describe('Membership ID'),
      membershipStatus: z.string().nullable().describe('Membership status'),
      paymentMethodType: z.string().nullable().describe('Payment method type'),
      cardBrand: z.string().nullable().describe('Card brand'),
      cardLast4: z.string().nullable().describe('Last 4 digits of card'),
      failureMessage: z.string().nullable().describe('Failure reason if payment failed'),
      taxAmount: z.number().nullable().describe('Tax amount'),
      metadata: z.record(z.string(), z.any()).nullable().describe('Custom metadata'),
      paidAt: z.string().nullable().describe('ISO 8601 payment timestamp'),
      createdAt: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhopClient(ctx.auth.token);
    let p = await client.getPayment(ctx.input.paymentId);

    return {
      output: {
        paymentId: p.id,
        status: p.status,
        substatus: p.substatus || null,
        currency: p.currency,
        total: p.total,
        subtotal: p.subtotal ?? null,
        usdTotal: p.usd_total ?? null,
        refundedAmount: p.refunded_amount || 0,
        refundable: p.refundable || false,
        retryable: p.retryable || false,
        billingReason: p.billing_reason || null,
        userId: p.user?.id || null,
        username: p.user?.username || null,
        userEmail: p.user?.email || null,
        productId: p.product?.id || null,
        productTitle: p.product?.title || null,
        membershipId: p.membership?.id || null,
        membershipStatus: p.membership?.status || null,
        paymentMethodType: p.payment_method_type || null,
        cardBrand: p.card_brand || null,
        cardLast4: p.card_last4 || null,
        failureMessage: p.failure_message || null,
        taxAmount: p.tax_amount ?? null,
        metadata: p.metadata || null,
        paidAt: p.paid_at || null,
        createdAt: p.created_at
      },
      message: `Payment \`${p.id}\`: **${p.status}** — ${p.currency.toUpperCase()} ${p.total}${p.user ? ` from ${p.user.username || p.user.email}` : ''}.`
    };
  })
  .build();
