import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

let USER_TRIGGER_TYPES = [
  'user_account_added',
  'user_account_updated',
  'user_account_deleted'
] as const;

export let userAccountEventsTrigger = SlateTrigger.create(spec, {
  name: 'User Account Events',
  key: 'user_account_events',
  description:
    'Triggered when user accounts are added, updated, or deleted on a membership-enabled Webflow site.'
})
  .input(
    z.object({
      triggerType: z.string().describe('Type of user account event'),
      userId: z.string().optional().describe('User account ID'),
      siteId: z.string().optional().describe('Site the user belongs to'),
      email: z.string().optional().describe('User email address'),
      eventId: z.string().optional().describe('Unique event identifier'),
      rawPayload: z.any().optional().describe('Complete webhook payload')
    })
  )
  .output(
    z.object({
      userId: z.string().optional().describe('User account ID'),
      siteId: z.string().optional().describe('Site the user belongs to'),
      email: z.string().optional().describe('User email address'),
      status: z.string().optional().describe('User account status')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      if (!ctx.config.siteId) {
        throw new Error('siteId is required in config for automatic webhook registration');
      }
      let client = new WebflowClient(ctx.auth.token);
      let registeredWebhookIds: string[] = [];

      for (let triggerType of USER_TRIGGER_TYPES) {
        let webhook = await client.createWebhook(ctx.config.siteId, {
          triggerType,
          url: ctx.input.webhookBaseUrl
        });
        registeredWebhookIds.push(webhook.id ?? webhook._id);
      }

      return {
        registrationDetails: {
          webhookIds: registeredWebhookIds,
          siteId: ctx.config.siteId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WebflowClient(ctx.auth.token);
      let webhookIds: string[] = ctx.input.registrationDetails.webhookIds ?? [];
      for (let webhookId of webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be removed
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventId = data._id ?? data.id ?? crypto.randomUUID();
      let user = data.user ?? data;

      return {
        inputs: [
          {
            triggerType: data.triggerType ?? 'user_account_event',
            userId: user.userId ?? user.id ?? user._id,
            siteId: data.siteId ?? data.site,
            email: user.email,
            eventId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = 'user_account.updated';
      if (ctx.input.triggerType === 'user_account_added') eventType = 'user_account.added';
      else if (ctx.input.triggerType === 'user_account_deleted')
        eventType = 'user_account.deleted';

      return {
        type: eventType,
        id: ctx.input.eventId ?? crypto.randomUUID(),
        output: {
          userId: ctx.input.userId,
          siteId: ctx.input.siteId,
          email: ctx.input.email,
          status: ctx.input.rawPayload?.user?.status ?? ctx.input.rawPayload?.status
        }
      };
    }
  })
  .build();
