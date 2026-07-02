import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let subscriptionEvent = SlateTrigger.create(spec, {
  name: 'Subscription Event',
  key: 'subscription_event',
  description:
    'Triggered when a subscription charge succeeds, fails, or when a subscription is cancelled. Covers all recurring billing lifecycle events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type from webhook'),
      transactionId: z.number().optional().describe('Transaction ID for the charge'),
      txRef: z.string().optional().describe('Transaction reference'),
      flwRef: z.string().optional().describe('Flutterwave reference'),
      amount: z.number().optional().describe('Charge amount'),
      currency: z.string().optional().describe('Charge currency'),
      status: z.string().describe('Charge or subscription status'),
      customerEmail: z.string().optional().describe('Customer email'),
      customerName: z.string().optional().describe('Customer name'),
      paymentPlanId: z.number().optional().describe('Associated payment plan ID'),
      createdAt: z.string().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      transactionId: z.number().optional().describe('Transaction ID for the charge'),
      txRef: z.string().optional().describe('Transaction reference'),
      flwRef: z.string().optional().describe('Flutterwave reference'),
      amount: z.number().optional().describe('Charge amount'),
      currency: z.string().optional().describe('Charge currency'),
      status: z.string().describe('Charge or subscription status'),
      customerEmail: z.string().optional().describe('Customer email'),
      customerName: z.string().optional().describe('Customer name'),
      paymentPlanId: z.number().optional().describe('Associated payment plan ID'),
      createdAt: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Subscription events come as charge.completed with payment plan info,
      // or as subscription-specific events
      let eventType = body.event || body.type;
      let d = body.data || {};

      // Skip non-subscription events
      let isSubscriptionEvent =
        eventType === 'subscription.cancelled' ||
        (eventType === 'charge.completed' && d.payment_plan != null);

      if (!isSubscriptionEvent) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            transactionId: d.id,
            txRef: d.tx_ref,
            flwRef: d.flw_ref,
            amount: d.amount,
            currency: d.currency,
            status: d.status,
            customerEmail: d.customer?.email,
            customerName: d.customer?.name,
            paymentPlanId: d.payment_plan,
            createdAt: d.created_at
          }
        ]
      };
    },
    handleEvent: async ctx => {
      let type =
        ctx.input.eventType === 'subscription.cancelled'
          ? 'subscription.cancelled'
          : ctx.input.status === 'successful'
            ? 'subscription.charge_successful'
            : 'subscription.charge_failed';

      let id = ctx.input.transactionId
        ? `subscription_${ctx.input.transactionId}`
        : `subscription_${ctx.input.customerEmail}_${ctx.input.createdAt}`;

      return {
        type,
        id,
        output: {
          transactionId: ctx.input.transactionId,
          txRef: ctx.input.txRef,
          flwRef: ctx.input.flwRef,
          amount: ctx.input.amount,
          currency: ctx.input.currency,
          status: ctx.input.status,
          customerEmail: ctx.input.customerEmail,
          customerName: ctx.input.customerName,
          paymentPlanId: ctx.input.paymentPlanId,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
