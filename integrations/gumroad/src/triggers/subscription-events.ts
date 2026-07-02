import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';

let SUBSCRIPTION_RESOURCE_NAMES = [
  'cancellation',
  'subscription_updated',
  'subscription_ended',
  'subscription_restarted'
] as const;

export let subscriptionEvents = SlateTrigger.create(spec, {
  name: 'Subscription Events',
  key: 'subscription_events',
  description:
    'Triggers when a subscription is cancelled, updated, ended, or restarted on your Gumroad account.'
})
  .input(
    z.object({
      resourceName: z.string().describe('The resource/event type that triggered this event'),
      subscriberId: z.string().describe('Unique subscriber ID'),
      payload: z.record(z.string(), z.any()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      subscriberId: z.string().describe('Unique subscriber ID'),
      productId: z.string().optional().describe('Product ID'),
      productName: z.string().optional().describe('Product name'),
      email: z.string().optional().describe('Subscriber email address'),
      status: z.string().optional().describe('Subscription status'),
      createdAt: z.string().optional().describe('Subscription creation timestamp'),
      endedAt: z.string().optional().describe('Subscription end timestamp'),
      restartedAt: z.string().optional().describe('When the subscription was restarted'),
      cancelled: z.boolean().optional().describe('Whether the subscription was cancelled'),
      ended: z.boolean().optional().describe('Whether the subscription has ended'),
      restarted: z.boolean().optional().describe('Whether the subscription was restarted')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GumroadClient({ token: ctx.auth.token });

      let registrations: Array<{ resourceSubscriptionId: string; resourceName: string }> = [];
      for (let resourceName of SUBSCRIPTION_RESOURCE_NAMES) {
        let sub = await client.createResourceSubscription(
          resourceName,
          ctx.input.webhookBaseUrl
        );
        registrations.push({
          resourceSubscriptionId: sub.id,
          resourceName
        });
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new GumroadClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        registrations: Array<{ resourceSubscriptionId: string; resourceName: string }>;
      };

      for (let reg of details.registrations) {
        try {
          await client.deleteResourceSubscription(reg.resourceSubscriptionId);
        } catch (_e) {
          // Subscription may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data: Record<string, any> = {};
      try {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        data = Object.fromEntries(params.entries());
      } catch (_e) {
        let json = (await ctx.request.json()) as Record<string, any>;
        data = json;
      }

      let resourceName = String(data.resource_name || 'subscription_updated');
      let subscriberId = String(
        data.subscriber_id || data.subscription_id || data.id || `unknown_${Date.now()}`
      );

      return {
        inputs: [
          {
            resourceName,
            subscriberId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { resourceName, subscriberId, payload } = ctx.input;

      let productId = payload.product_id ? String(payload.product_id) : undefined;
      let productName = payload.product_name ? String(payload.product_name) : undefined;
      let email = payload.email ? String(payload.email) : undefined;
      let createdAt = payload.created_at ? String(payload.created_at) : undefined;
      let endedAt = payload.ended_at ? String(payload.ended_at) : undefined;
      let restartedAt = payload.restarted_at ? String(payload.restarted_at) : undefined;

      let status: string | undefined;
      if (resourceName === 'cancellation') {
        status = 'cancelled';
      } else if (resourceName === 'subscription_ended') {
        status = 'ended';
      } else if (resourceName === 'subscription_restarted') {
        status = 'active';
      } else {
        status = payload.status ? String(payload.status) : undefined;
      }

      return {
        type: `subscription.${resourceName}`,
        id: `${resourceName}_${subscriberId}_${payload.sale_timestamp || Date.now()}`,
        output: {
          subscriberId,
          productId,
          productName,
          email,
          status,
          createdAt,
          endedAt,
          restartedAt,
          cancelled: resourceName === 'cancellation' ? true : undefined,
          ended: resourceName === 'subscription_ended' ? true : undefined,
          restarted: resourceName === 'subscription_restarted' ? true : undefined
        }
      };
    }
  })
  .build();
