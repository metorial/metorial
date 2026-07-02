import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let subscriptionEvents = SlateTrigger.create(spec, {
  name: 'Subscription Events',
  key: 'subscription_events',
  description:
    'Triggers on subscription lifecycle events: created, disabled, not renewing, or expiring cards.'
})
  .input(
    z.object({
      eventType: z.string().describe('Paystack event type'),
      eventId: z.string().describe('Unique event identifier'),
      subscriptionCode: z.string().describe('Subscription code'),
      status: z.string().describe('Subscription status'),
      amount: z.number().describe('Subscription amount'),
      planCode: z.string().describe('Plan code'),
      customerEmail: z.string().describe('Customer email'),
      customerCode: z.string().describe('Customer code'),
      nextPaymentDate: z.string().nullable().describe('Next payment date'),
      emailToken: z.string().describe('Email token')
    })
  )
  .output(
    z.object({
      subscriptionCode: z.string().describe('Subscription code'),
      status: z.string().describe('Subscription status'),
      amount: z.number().describe('Subscription amount'),
      planCode: z.string().describe('Plan code'),
      customerEmail: z.string().describe('Customer email'),
      customerCode: z.string().describe('Customer code'),
      nextPaymentDate: z.string().nullable().describe('Next payment date'),
      emailToken: z.string().describe('Email token')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;
      let event = body.event as string;

      if (!event.startsWith('subscription.')) {
        return { inputs: [] };
      }

      let sub = body.data;
      let customer = sub.customer ?? {};

      return {
        inputs: [
          {
            eventType: event,
            eventId: `${event}_${sub.subscription_code}_${Date.now()}`,
            subscriptionCode: sub.subscription_code ?? '',
            status: sub.status ?? '',
            amount: sub.amount ?? 0,
            planCode: sub.plan?.plan_code ?? '',
            customerEmail: customer.email ?? '',
            customerCode: customer.customer_code ?? '',
            nextPaymentDate: sub.next_payment_date ?? null,
            emailToken: sub.email_token ?? ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        'subscription.create': 'subscription.created',
        'subscription.disable': 'subscription.disabled',
        'subscription.not_renewing': 'subscription.not_renewing',
        'subscription.expiring_cards': 'subscription.expiring_cards'
      };

      return {
        type: typeMap[ctx.input.eventType] ?? `subscription.${ctx.input.status}`,
        id: ctx.input.eventId,
        output: {
          subscriptionCode: ctx.input.subscriptionCode,
          status: ctx.input.status,
          amount: ctx.input.amount,
          planCode: ctx.input.planCode,
          customerEmail: ctx.input.customerEmail,
          customerCode: ctx.input.customerCode,
          nextPaymentDate: ctx.input.nextPaymentDate,
          emailToken: ctx.input.emailToken
        }
      };
    }
  })
  .build();
