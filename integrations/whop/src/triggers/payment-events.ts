import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let paymentEvents = SlateTrigger.create(spec, {
  name: 'Payment Events',
  key: 'payment_events',
  description:
    'Triggers when a payment succeeds or fails. Covers payment.succeeded and payment.failed webhook events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type (payment.succeeded or payment.failed)'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      paymentId: z.string().describe('Payment ID'),
      status: z.string().describe('Payment status'),
      substatus: z.string().nullable().describe('Payment substatus'),
      currency: z.string().describe('Currency code'),
      total: z.number().describe('Payment total'),
      userId: z.string().nullable().describe('User ID'),
      username: z.string().nullable().describe('Username'),
      userEmail: z.string().nullable().describe('User email'),
      productId: z.string().nullable().describe('Product ID'),
      productTitle: z.string().nullable().describe('Product title'),
      membershipId: z.string().nullable().describe('Membership ID'),
      billingReason: z.string().nullable().describe('Billing reason'),
      paymentMethodType: z.string().nullable().describe('Payment method type'),
      failureMessage: z.string().nullable().describe('Failure message if payment failed'),
      paidAt: z.string().nullable().describe('ISO 8601 payment timestamp'),
      createdAt: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('Payment ID'),
      status: z.string().describe('Payment status'),
      substatus: z.string().nullable().describe('Payment substatus'),
      currency: z.string().describe('Currency code'),
      total: z.number().describe('Payment total'),
      userId: z.string().nullable().describe('User ID'),
      username: z.string().nullable().describe('Username'),
      userEmail: z.string().nullable().describe('User email'),
      productId: z.string().nullable().describe('Product ID'),
      productTitle: z.string().nullable().describe('Product title'),
      membershipId: z.string().nullable().describe('Membership ID'),
      billingReason: z.string().nullable().describe('Billing reason'),
      paymentMethodType: z.string().nullable().describe('Payment method type'),
      failureMessage: z.string().nullable().describe('Failure message'),
      paidAt: z.string().nullable().describe('ISO 8601 payment timestamp'),
      createdAt: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = body.type;

      if (!eventType?.startsWith('payment.')) {
        return { inputs: [] };
      }

      let payment = body.data || {};

      return {
        inputs: [
          {
            eventType,
            eventId: `${payment.id}_${eventType}_${payment.updated_at || payment.created_at || Date.now()}`,
            paymentId: payment.id,
            status: payment.status,
            substatus: payment.substatus || null,
            currency: payment.currency,
            total: payment.total,
            userId: payment.user?.id || null,
            username: payment.user?.username || null,
            userEmail: payment.user?.email || null,
            productId: payment.product?.id || null,
            productTitle: payment.product?.title || null,
            membershipId: payment.membership?.id || null,
            billingReason: payment.billing_reason || null,
            paymentMethodType: payment.payment_method_type || null,
            failureMessage: payment.failure_message || null,
            paidAt: payment.paid_at || null,
            createdAt: payment.created_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          paymentId: ctx.input.paymentId,
          status: ctx.input.status,
          substatus: ctx.input.substatus,
          currency: ctx.input.currency,
          total: ctx.input.total,
          userId: ctx.input.userId,
          username: ctx.input.username,
          userEmail: ctx.input.userEmail,
          productId: ctx.input.productId,
          productTitle: ctx.input.productTitle,
          membershipId: ctx.input.membershipId,
          billingReason: ctx.input.billingReason,
          paymentMethodType: ctx.input.paymentMethodType,
          failureMessage: ctx.input.failureMessage,
          paidAt: ctx.input.paidAt,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
