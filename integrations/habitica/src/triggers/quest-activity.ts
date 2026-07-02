import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { spec } from '../spec';

export let questActivity = SlateTrigger.create(spec, {
  name: 'Quest Activity',
  key: 'quest_activity',
  description:
    'Triggers on quest-related events: quest started, quest finished, or quest invitation received.'
})
  .input(
    z.object({
      activityType: z
        .string()
        .describe('Type of quest activity: questStarted, questFinished, or questInvited'),
      eventId: z.string().describe('Unique event identifier'),
      rawPayload: z.record(z.string(), z.any()).optional().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      activityType: z
        .string()
        .describe('Event type: questStarted, questFinished, or questInvited'),
      questKey: z.string().optional().describe('Quest key identifier'),
      groupId: z.string().optional().describe('Group/party ID where the quest is occurring')
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
        label: 'Slates Quest Activity',
        type: 'questActivity',
        enabled: true,
        options: {
          questStarted: true,
          questFinished: true,
          questInvited: true
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
      let eventId = `quest-${activityType}-${Date.now()}`;

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
      let quest = payload.quest || {};
      let group = payload.group || {};

      return {
        type: `quest.${ctx.input.activityType}`,
        id: ctx.input.eventId,
        output: {
          activityType: ctx.input.activityType,
          questKey: quest.key || payload.questKey,
          groupId: group.id || group._id || payload.groupId
        }
      };
    }
  })
  .build();
