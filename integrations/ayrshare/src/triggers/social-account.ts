import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let socialAccountTrigger = SlateTrigger.create(spec, {
  name: 'Social Account Changed',
  key: 'social_account_changed',
  description:
    'Triggered when a user profile links, unlinks, or refreshes a social network connection. Covers both user-initiated and system-initiated (e.g., expired token) actions.'
})
  .input(
    z.object({
      action: z.string().describe('Webhook action type'),
      hookId: z.string().optional().describe('Webhook hook ID'),
      platform: z.string().optional().describe('Social platform affected'),
      actionType: z.string().optional().describe('Action type: link, unlink, or refresh'),
      source: z.string().optional().describe('Action source: user or system'),
      displayName: z.string().optional().describe('Display name of the social account'),
      refId: z.string().optional().describe('Profile reference ID'),
      created: z.string().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      platform: z
        .string()
        .optional()
        .describe('Social platform that was linked/unlinked/refreshed'),
      actionType: z.string().optional().describe('Action type: link, unlink, or refresh'),
      source: z.string().optional().describe('Whether user or system initiated'),
      displayName: z.string().optional().describe('Display name of the social account'),
      refId: z.string().optional().describe('Profile reference ID'),
      created: z.string().optional().describe('Event creation timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        profileKey: ctx.config.profileKey
      });

      let result = await client.registerWebhook({
        action: 'social',
        url: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          action: 'social',
          hookId: result.hookId || result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        profileKey: ctx.config.profileKey
      });

      await client.unregisterWebhook({
        action: ctx.input.registrationDetails.action || 'social'
      });
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            action: data.action || 'social',
            hookId: data.hookId,
            platform: data.platform,
            actionType: data.type,
            source: data.source,
            displayName: data.displayName,
            refId: data.refId,
            created: data.created
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let actionType = ctx.input.actionType || 'unknown';
      return {
        type: `social_account.${actionType}`,
        id: ctx.input.hookId || `social-${ctx.input.platform}-${actionType}-${Date.now()}`,
        output: {
          platform: ctx.input.platform,
          actionType: ctx.input.actionType,
          source: ctx.input.source,
          displayName: ctx.input.displayName,
          refId: ctx.input.refId,
          created: ctx.input.created
        }
      };
    }
  })
  .build();
