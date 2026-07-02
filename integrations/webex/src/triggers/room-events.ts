import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

export let roomEvents = SlateTrigger.create(spec, {
  name: 'Space Events',
  key: 'room_events',
  description: 'Triggers when spaces (rooms) are created, updated, or deleted in Webex.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated', 'deleted']).describe('Type of space event'),
      webhookPayload: z.any().describe('Raw webhook notification payload from Webex')
    })
  )
  .output(
    z.object({
      spaceId: z.string().describe('ID of the space'),
      title: z.string().optional().describe('Title of the space'),
      type: z.string().optional().describe('Type of space (direct or group)'),
      isLocked: z.boolean().optional().describe('Whether the space is moderated'),
      teamId: z.string().optional().describe('Associated team ID'),
      lastActivity: z.string().optional().describe('Timestamp of last activity'),
      creatorId: z.string().optional().describe('Person ID of the creator'),
      created: z.string().optional().describe('Creation timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new WebexClient({ token: ctx.auth.token });

      let events = ['created', 'updated', 'deleted'];
      let webhookIds: string[] = [];

      for (let event of events) {
        let webhook = await client.createWebhook({
          name: `Slates Room ${event}`,
          targetUrl: ctx.input.webhookBaseUrl,
          resource: 'rooms',
          event
        });
        webhookIds.push(webhook.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WebexClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds || []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event,
            webhookPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.webhookPayload;
      let resourceData = payload.data || {};

      let room = resourceData;
      if (ctx.input.eventType !== 'deleted' && resourceData.id) {
        try {
          let client = new WebexClient({ token: ctx.auth.token });
          room = await client.getRoom(resourceData.id);
        } catch {
          // Fall back to webhook data
        }
      }

      return {
        type: `room.${ctx.input.eventType}`,
        id: payload.id || resourceData.id || `room-${Date.now()}`,
        output: {
          spaceId: room.id || resourceData.id,
          title: room.title,
          type: room.type,
          isLocked: room.isLocked,
          teamId: room.teamId,
          lastActivity: room.lastActivity,
          creatorId: room.creatorId,
          created: room.created || resourceData.created
        }
      };
    }
  })
  .build();
