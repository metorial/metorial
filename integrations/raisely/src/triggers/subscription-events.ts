import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let subscriptionEvents = SlateTrigger.create(spec, {
  name: 'Subscription Events',
  key: 'subscription_events',
  description:
    'Triggers on recurring giving subscription lifecycle events: created, succeeded, updated, failing, failed, rebilled, paused, resumed, cancelled, deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of subscription event'),
      subscriptionUuid: z.string().describe('UUID of the subscription'),
      subscription: z
        .record(z.string(), z.any())
        .describe('Full subscription object from the webhook payload')
    })
  )
  .output(
    z.object({
      subscriptionUuid: z.string().describe('UUID of the subscription'),
      campaignUuid: z.string().optional().describe('UUID of the campaign'),
      profileUuid: z.string().optional().describe('UUID of the profile'),
      userUuid: z.string().optional().describe('UUID of the subscriber'),
      amount: z.number().optional().describe('Recurring amount in smallest currency unit'),
      currency: z.string().optional().describe('Currency code'),
      frequency: z.string().optional().describe('Billing frequency (WEEKLY, MONTHLY, etc.)'),
      status: z
        .string()
        .optional()
        .describe('Subscription status (OK, PAUSED, CANCELLED, FAILING, FAILED)'),
      email: z.string().optional().describe('Subscriber email'),
      firstName: z.string().optional().describe('Subscriber first name'),
      lastName: z.string().optional().describe('Subscriber last name'),
      createdAt: z.string().optional().describe('When the subscription was created')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new RaiselyClient({ token: ctx.auth.token });
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        campaignUuid: ctx.config.campaignUuid
      });
      let webhook = result.data || result;
      return { registrationDetails: { webhookUuid: webhook.uuid } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new RaiselyClient({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookUuid);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let type = String(data.type || '');
      if (!type.startsWith('subscription.')) {
        return { inputs: [] };
      }
      let eventType = type.replace('subscription.', '');
      let subscription = (data.data || {}) as Record<string, any>;
      return {
        inputs: [
          {
            eventType,
            subscriptionUuid: String(subscription.uuid || data.uuid || ''),
            subscription
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let s = ctx.input.subscription as Record<string, any>;
      return {
        type: `subscription.${ctx.input.eventType}`,
        id: ctx.input.subscriptionUuid,
        output: {
          subscriptionUuid: String(s.uuid || ctx.input.subscriptionUuid),
          campaignUuid: s.campaignUuid as string | undefined,
          profileUuid: s.profileUuid as string | undefined,
          userUuid: s.userUuid as string | undefined,
          amount: s.amount as number | undefined,
          currency: s.currency as string | undefined,
          frequency: s.frequency as string | undefined,
          status: s.status as string | undefined,
          email: s.email as string | undefined,
          firstName: s.firstName as string | undefined,
          lastName: s.lastName as string | undefined,
          createdAt: s.createdAt as string | undefined
        }
      };
    }
  })
  .build();
