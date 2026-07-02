import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { spec } from '../spec';

export let userActivity = SlateTrigger.create(spec, {
  name: 'User Activity',
  key: 'user_activity',
  description:
    'Triggers on user-level events: leveling up, hatching a pet, or raising a mount.'
})
  .input(
    z.object({
      activityType: z
        .string()
        .describe('Type of user activity: leveledUp, petHatched, or mountRaised'),
      eventId: z.string().describe('Unique event identifier'),
      rawPayload: z.record(z.string(), z.any()).optional().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      activityType: z.string().describe('Event type: leveledUp, petHatched, or mountRaised'),
      level: z.number().optional().describe('New level (for leveledUp events)'),
      petKey: z.string().optional().describe('Pet key (for petHatched events)'),
      mountKey: z.string().optional().describe('Mount key (for mountRaised events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new HabiticaClient({
        userId: ctx.auth.userId,
        token: ctx.auth.token,
        xClient: ctx.config.xClient
      });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        label: 'Slates User Activity',
        type: 'userActivity',
        enabled: true,
        options: {
          mountRaised: true,
          petHatched: true,
          leveledUp: true
        }
      });

      return {
        registrationDetails: {
          webhookId: webhook.id || webhook._id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new HabiticaClient({
        userId: ctx.auth.userId,
        token: ctx.auth.token,
        xClient: ctx.config.xClient
      });

      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, any>;

      let activityType = body.type || body.webhookType || 'unknown';
      let eventId = `user-${activityType}-${Date.now()}`;

      return {
        inputs: [
          {
            activityType,
            eventId,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload || {};

      return {
        type: `user.${ctx.input.activityType}`,
        id: ctx.input.eventId,
        output: {
          activityType: ctx.input.activityType,
          level: payload.initialLvl !== undefined ? payload.initialLvl + 1 : payload.level,
          petKey: payload.pet,
          mountKey: payload.mount
        }
      };
    }
  })
  .build();
