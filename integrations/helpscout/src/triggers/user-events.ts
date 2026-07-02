import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

export let userEvents = SlateTrigger.create(spec, {
  name: 'User Status Changed',
  key: 'user_events',
  description: 'Triggered when a user (agent) availability status changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Help Scout event type'),
      userId: z.number().describe('User ID'),
      status: z.string().nullable().describe('New user status'),
      webhookId: z.string().describe('Webhook delivery identifier')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('User ID'),
      status: z.string().nullable().describe('New user status')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new HelpScoutClient(ctx.auth.token);
      let secret = crypto.randomUUID();
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: ['user.status.changed'],
        secret,
        payloadVersion: 'V2'
      });

      return {
        registrationDetails: {
          webhookId: result.webhookId,
          secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new HelpScoutClient(ctx.auth.token);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(Number(webhookId));
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;
      let eventType = data?.event ?? data?.eventType ?? 'user.status.changed';
      let user = data?.payload?.user ?? data?.user ?? data ?? {};

      let userId = user.id ?? 0;
      let status = user.status ?? null;

      let webhookId = `${eventType}-${userId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            userId,
            status,
            webhookId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'user.status_changed',
        id: ctx.input.webhookId,
        output: {
          userId: ctx.input.userId,
          status: ctx.input.status
        }
      };
    }
  })
  .build();
