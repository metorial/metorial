import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let SUBSCRIPTION_EVENT_TYPES = ['subscription.created', 'subscription.updated'];

export let subscriptionEvents = SlateTrigger.create(spec, {
  name: 'Subscription Events',
  key: 'subscription_events',
  description:
    'Triggered when subscriptions are created or updated (status changes like active, canceled, paused).'
})
  .input(
    z.object({
      eventType: z.string(),
      eventId: z.string(),
      merchantId: z.string().optional(),
      createdAt: z.string().optional(),
      rawSubscription: z.record(z.string(), z.any())
    })
  )
  .output(
    z.object({
      subscriptionId: z.string().optional(),
      status: z.string().optional(),
      locationId: z.string().optional(),
      customerId: z.string().optional(),
      planVariationId: z.string().optional(),
      startDate: z.string().optional(),
      canceledDate: z.string().optional(),
      createdAt: z.string().optional(),
      version: z.number().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      let subscription = await client.createWebhookSubscription({
        idempotencyKey: crypto.randomUUID(),
        subscription: {
          name: 'Square Subscription Events',
          eventTypes: SUBSCRIPTION_EVENT_TYPES,
          notificationUrl: ctx.input.webhookBaseUrl
        }
      });
      return { registrationDetails: { subscriptionId: subscription.id } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      await client.deleteWebhookSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      if (!body?.type) return { inputs: [] };

      let sub = body.data?.object?.subscription || body.data?.object || {};

      return {
        inputs: [
          {
            eventType: body.type,
            eventId: body.event_id || crypto.randomUUID(),
            merchantId: body.merchant_id,
            createdAt: body.created_at,
            rawSubscription: sub
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let s = ctx.input.rawSubscription as any;
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          subscriptionId: s.id,
          status: s.status,
          locationId: s.location_id,
          customerId: s.customer_id,
          planVariationId: s.plan_variation_id,
          startDate: s.start_date,
          canceledDate: s.canceled_date,
          createdAt: s.created_at,
          version: s.version
        }
      };
    }
  })
  .build();
