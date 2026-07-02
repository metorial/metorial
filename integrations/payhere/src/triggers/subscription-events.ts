import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PayhereClient } from '../lib/client';
import { spec } from '../spec';

export let subscriptionEvents = SlateTrigger.create(spec, {
  name: 'Subscription Events',
  key: 'subscription_events',
  description:
    'Triggers when a subscription is created or cancelled. Includes subscription details, customer, and plan data.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'cancelled']).describe('Type of subscription event'),
      eventId: z.string().describe('Unique event identifier'),
      subscriptionId: z.number().describe('Subscription ID'),
      status: z.string().describe('Subscription status'),
      billingInterval: z.string().nullable().describe('Billing interval'),
      customerId: z.number().nullable().describe('Customer ID'),
      customerName: z.string().nullable().describe('Customer name'),
      customerEmail: z.string().nullable().describe('Customer email'),
      planId: z.number().nullable().describe('Plan ID'),
      planName: z.string().nullable().describe('Plan name'),
      planPrice: z.string().nullable().describe('Plan price'),
      planCurrency: z.string().nullable().describe('Plan currency')
    })
  )
  .output(
    z.object({
      subscriptionId: z.number().describe('Subscription identifier'),
      status: z.string().describe('Subscription status'),
      billingInterval: z.string().nullable().describe('Billing frequency'),
      customerId: z.number().nullable().describe('Customer ID'),
      customerName: z.string().nullable().describe('Customer name'),
      customerEmail: z.string().nullable().describe('Customer email'),
      planId: z.number().nullable().describe('Associated plan ID'),
      planName: z.string().nullable().describe('Associated plan name'),
      planPrice: z.string().nullable().describe('Plan price'),
      planCurrency: z.string().nullable().describe('Plan currency')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PayhereClient({ token: ctx.auth.token });

      let createdHook = await client.createHook({
        resource: 'subscription_created',
        postUrl: ctx.input.webhookBaseUrl,
        integration: 'slates'
      });

      let cancelledHook = await client.createHook({
        resource: 'subscription_cancelled',
        postUrl: ctx.input.webhookBaseUrl,
        integration: 'slates'
      });

      return {
        registrationDetails: {
          createdHookId: createdHook.hookId,
          cancelledHookId: cancelledHook.hookId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new PayhereClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        createdHookId: number;
        cancelledHookId: number;
      };

      await client.deleteHook(details.createdHookId);
      await client.deleteHook(details.cancelledHookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let trigger = body.trigger || '';
      let subscription = body.data?.subscription || body.data || {};
      let customer = body.data?.customer || subscription.customer || {};
      let plan = body.data?.plan || subscription.plan || {};

      let eventType: 'created' | 'cancelled' = trigger.includes('cancelled')
        ? 'cancelled'
        : 'created';

      return {
        inputs: [
          {
            eventType,
            eventId: `subscription-${eventType}-${subscription.id || Date.now()}`,
            subscriptionId: subscription.id,
            status: subscription.status || eventType,
            billingInterval: subscription.billing_interval || null,
            customerId: customer.id || null,
            customerName: customer.name || null,
            customerEmail: customer.email || null,
            planId: plan.id || null,
            planName: plan.name || null,
            planPrice: plan.price || null,
            planCurrency: plan.currency || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `subscription.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          subscriptionId: ctx.input.subscriptionId,
          status: ctx.input.status,
          billingInterval: ctx.input.billingInterval,
          customerId: ctx.input.customerId,
          customerName: ctx.input.customerName,
          customerEmail: ctx.input.customerEmail,
          planId: ctx.input.planId,
          planName: ctx.input.planName,
          planPrice: ctx.input.planPrice,
          planCurrency: ctx.input.planCurrency
        }
      };
    }
  })
  .build();
