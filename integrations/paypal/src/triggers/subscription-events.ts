import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { spec } from '../spec';

let SUBSCRIPTION_EVENT_TYPES = [
  'BILLING.SUBSCRIPTION.CREATED',
  'BILLING.SUBSCRIPTION.ACTIVATED',
  'BILLING.SUBSCRIPTION.UPDATED',
  'BILLING.SUBSCRIPTION.EXPIRED',
  'BILLING.SUBSCRIPTION.CANCELLED',
  'BILLING.SUBSCRIPTION.SUSPENDED',
  'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
  'BILLING.PLAN.CREATED',
  'BILLING.PLAN.UPDATED',
  'BILLING.PLAN.ACTIVATED',
  'BILLING.PLAN.DEACTIVATED',
  'BILLING.PLAN.PRICING-CHANGE.ACTIVATED',
  'CATALOG.PRODUCT.CREATED',
  'CATALOG.PRODUCT.UPDATED'
];

export let subscriptionEvents = SlateTrigger.create(spec, {
  name: 'Subscription & Billing Events',
  key: 'subscription_events',
  description:
    'Triggers on subscription lifecycle events including creation, activation, cancellation, suspension, payment failures, and plan/product changes.'
})
  .input(
    z.object({
      eventId: z.string().describe('PayPal webhook event ID'),
      eventType: z.string().describe('Event type'),
      resourceType: z.string().optional().describe('Resource type'),
      resource: z.any().describe('Full event resource payload'),
      createTime: z.string().optional().describe('Event creation time')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('Subscription, plan, or product ID'),
      resourceType: z
        .string()
        .optional()
        .describe('Resource type (subscription, plan, product)'),
      status: z.string().optional().describe('Resource status'),
      planId: z.string().optional().describe('Associated plan ID (for subscriptions)'),
      subscriberEmail: z.string().optional().describe('Subscriber email (for subscriptions)'),
      name: z.string().optional().describe('Resource name (for plans/products)'),
      createTime: z.string().optional().describe('Resource creation time'),
      resource: z.any().optional().describe('Full resource details')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PayPalClient({
        token: ctx.auth.token,
        clientId: ctx.auth.clientId,
        clientSecret: ctx.auth.clientSecret,
        environment: ctx.auth.environment
      });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        eventTypes: SUBSCRIPTION_EVENT_TYPES
      });

      return {
        registrationDetails: { webhookId: webhook.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new PayPalClient({
        token: ctx.auth.token,
        clientId: ctx.auth.clientId,
        clientSecret: ctx.auth.clientSecret,
        environment: ctx.auth.environment
      });
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      return {
        inputs: [
          {
            eventId: data.id,
            eventType: data.event_type,
            resourceType: data.resource_type,
            resource: data.resource,
            createTime: data.create_time
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let resource = ctx.input.resource || {};

      return {
        type: ctx.input.eventType.toLowerCase().replace(/\./g, '.'),
        id: ctx.input.eventId,
        output: {
          resourceId: resource.id,
          resourceType: ctx.input.resourceType,
          status: resource.status,
          planId: resource.plan_id,
          subscriberEmail: resource.subscriber?.email_address,
          name: resource.name,
          createTime: resource.create_time,
          resource
        }
      };
    }
  })
  .build();
