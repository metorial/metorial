import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userEventTypes = [
  'USER_JOINED_WORKSPACE',
  'USER_DELETED_FROM_WORKSPACE',
  'USER_ACTIVATED_ON_WORKSPACE',
  'USER_DEACTIVATED_ON_WORKSPACE',
  'USER_EMAIL_CHANGED',
  'USER_UPDATED'
] as const;

let eventTypeMap: Record<string, string> = {
  USER_JOINED_WORKSPACE: 'user.joined',
  USER_DELETED_FROM_WORKSPACE: 'user.deleted',
  USER_ACTIVATED_ON_WORKSPACE: 'user.activated',
  USER_DEACTIVATED_ON_WORKSPACE: 'user.deactivated',
  USER_EMAIL_CHANGED: 'user.email_changed',
  USER_UPDATED: 'user.updated'
};

export let userEvents = SlateTrigger.create(spec, {
  name: 'User Events',
  key: 'user_events',
  description:
    'Triggered when users join, leave, are activated/deactivated, or are updated in the workspace.'
})
  .input(
    z.object({
      eventType: z.string().describe('Clockify webhook event type'),
      user: z.any().describe('User data from webhook payload')
    })
  )
  .output(
    z.object({
      userId: z.string(),
      name: z.string().optional(),
      email: z.string().optional(),
      status: z.string().optional(),
      workspaceId: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let webhookIds: string[] = [];
      for (let eventType of userEventTypes) {
        let webhook = await client.createWebhook({
          name: `slates_${eventType}`,
          url: ctx.input.webhookBaseUrl,
          triggerEvent: eventType
        });
        webhookIds.push(webhook.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let details = ctx.input.registrationDetails as { webhookIds: string[] };
      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_e) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.triggerEvent || data.eventType || 'UNKNOWN',
            user: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let user = ctx.input.user;
      let userId = user.id || user.userId || 'unknown';
      let mappedType =
        eventTypeMap[ctx.input.eventType] || `user.${ctx.input.eventType.toLowerCase()}`;

      return {
        type: mappedType,
        id: `${ctx.input.eventType}_${userId}_${user.changeDate || Date.now()}`,
        output: {
          userId,
          name: user.name || undefined,
          email: user.email || undefined,
          status: user.status || undefined,
          workspaceId: user.workspaceId || undefined
        }
      };
    }
  })
  .build();
