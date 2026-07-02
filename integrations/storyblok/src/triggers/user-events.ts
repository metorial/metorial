import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { spec } from '../spec';

export let userEvents = SlateTrigger.create(spec, {
  name: 'User Events',
  key: 'user_events',
  description:
    'Triggers when collaborators are added, removed, or have their roles updated in the space.'
})
  .input(
    z.object({
      eventType: z.enum(['added', 'removed', 'roles_updated']).describe('Type of user event'),
      userId: z.number().optional().describe('ID of the affected user'),
      spaceId: z.number().optional().describe('Space ID'),
      webhookId: z.string().describe('Unique ID for deduplication')
    })
  )
  .output(
    z.object({
      userId: z.number().optional().describe('ID of the affected user'),
      spaceId: z.number().optional().describe('Space ID where the change occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new StoryblokClient({
        token: ctx.auth.token,
        region: ctx.auth.region,
        spaceId: ctx.config.spaceId
      });

      let webhook = await client.createWebhook({
        name: 'Slates - User Events',
        endpoint: ctx.input.webhookBaseUrl,
        actions: ['user.added', 'user.removed', 'user.roles_updated'],
        activated: true
      });

      return {
        registrationDetails: {
          webhookId: webhook.id?.toString()
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new StoryblokClient({
        token: ctx.auth.token,
        region: ctx.auth.region,
        spaceId: ctx.config.spaceId
      });

      let details = ctx.input.registrationDetails as { webhookId?: string };
      if (details.webhookId) {
        await client.deleteWebhook(details.webhookId);
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as {
        action?: string;
        user_id?: number;
        space_id?: number;
      };

      let actionParts = (body.action || '').split('.');
      let eventType = actionParts[1] as string | undefined;

      if (!eventType || !['added', 'removed', 'roles_updated'].includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: eventType as 'added' | 'removed' | 'roles_updated',
            userId: body.user_id,
            spaceId: body.space_id,
            webhookId: `user-${body.user_id}-${eventType}-${Date.now()}`
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `user.${ctx.input.eventType}`,
        id: ctx.input.webhookId,
        output: {
          userId: ctx.input.userId,
          spaceId: ctx.input.spaceId
        }
      };
    }
  })
  .build();
