import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let spaceEvents = SlateTrigger.create(spec, {
  name: 'Space Events',
  key: 'space_events',
  description:
    'Triggered when spaces are created, updated, removed, or when space permissions or logos change.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of space event'),
      spaceKey: z.string().describe('The space key'),
      spaceId: z.string().optional().describe('The space ID'),
      timestamp: z.string().describe('When the event occurred'),
      userAccountId: z.string().optional().describe('The user who triggered the event'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      spaceKey: z.string().describe('The space key'),
      spaceId: z.string().optional().describe('The space ID'),
      spaceName: z.string().optional().describe('The space name'),
      authorId: z.string().optional().describe('The user who triggered the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);

      let result = await client.registerWebhook({
        name: 'Slates Space Events',
        url: ctx.input.webhookBaseUrl,
        events: [
          'space_created',
          'space_updated',
          'space_removed',
          'space_permissions_updated',
          'space_logo_updated'
        ]
      });

      return {
        registrationDetails: { webhookId: String(result.id || result) }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      await client.unregisterWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event || data.eventType || 'unknown';
      let spaceKey = data.space?.key || data.key || '';
      let spaceId = data.space?.id ? String(data.space.id) : undefined;
      let timestamp = data.timestamp ? String(data.timestamp) : new Date().toISOString();
      let userAccountId = data.userAccountId || data.user?.accountId;

      return {
        inputs: [
          {
            eventType: String(eventType),
            spaceKey: String(spaceKey),
            spaceId,
            timestamp,
            userAccountId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `space.${ctx.input.eventType.replace('space_', '')}`,
        id: `${ctx.input.spaceKey}-${ctx.input.eventType}-${ctx.input.timestamp}`,
        output: {
          spaceKey: ctx.input.spaceKey,
          spaceId: ctx.input.spaceId,
          spaceName: ctx.input.rawPayload?.space?.name,
          authorId: ctx.input.userAccountId
        }
      };
    }
  })
  .build();
