import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { spec } from '../spec';

export let subscriptionEvents = SlateTrigger.create(spec, {
  name: 'Subscription Events',
  key: 'subscription_events',
  description:
    'Triggered when subscription lifecycle events occur, including creation, updates, cancellation, trial expiration, pausing, and resumption.'
})
  .input(
    z.object({
      eventId: z.string().describe('Stripe event ID'),
      eventType: z.string().describe('Event type (e.g., customer.subscription.created)'),
      resourceId: z.string().describe('Subscription ID'),
      resource: z.any().describe('Full subscription object from the event'),
      created: z.number().describe('Event creation timestamp')
    })
  )
  .output(
    z.object({
      subscriptionId: z.string().describe('Subscription ID'),
      customerId: z.string().describe('Customer ID'),
      status: z.string().describe('Subscription status'),
      currentPeriodStart: z.number().optional().describe('Start of current billing period'),
      currentPeriodEnd: z.number().optional().describe('End of current billing period'),
      cancelAtPeriodEnd: z
        .boolean()
        .optional()
        .describe('Whether subscription will cancel at period end'),
      canceledAt: z.number().optional().nullable().describe('Cancellation timestamp'),
      trialStart: z.number().optional().nullable().describe('Trial start timestamp'),
      trialEnd: z.number().optional().nullable().describe('Trial end timestamp'),
      created: z.number().optional().describe('Subscription creation timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new StripeClient({
        token: ctx.auth.token,
        stripeAccountId: ctx.config.stripeAccountId
      });

      let result = await client.createWebhookEndpoint({
        url: ctx.input.webhookBaseUrl,
        enabled_events: [
          'customer.subscription.created',
          'customer.subscription.updated',
          'customer.subscription.deleted',
          'customer.subscription.paused',
          'customer.subscription.resumed',
          'customer.subscription.trial_will_end',
          'customer.subscription.pending_update_applied',
          'customer.subscription.pending_update_expired'
        ]
      });

      return {
        registrationDetails: {
          webhookEndpointId: result.id,
          secret: result.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new StripeClient({
        token: ctx.auth.token,
        stripeAccountId: ctx.config.stripeAccountId
      });

      await client.deleteWebhookEndpoint(ctx.input.registrationDetails.webhookEndpointId);
    },

    handleRequest: async ctx => {
      let body: any = await ctx.request.json();

      if (!body?.type || !body.data?.object) {
        return { inputs: [] };
      }

      let obj = body.data.object;

      return {
        inputs: [
          {
            eventId: body.id,
            eventType: body.type,
            resourceId: obj.id,
            resource: obj,
            created: body.created
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { resource } = ctx.input;
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          subscriptionId: ctx.input.resourceId,
          customerId: resource.customer,
          status: resource.status,
          currentPeriodStart: resource.current_period_start,
          currentPeriodEnd: resource.current_period_end,
          cancelAtPeriodEnd: resource.cancel_at_period_end,
          canceledAt: resource.canceled_at || null,
          trialStart: resource.trial_start || null,
          trialEnd: resource.trial_end || null,
          created: resource.created
        }
      };
    }
  })
  .build();
