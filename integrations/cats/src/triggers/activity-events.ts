import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ACTIVITY_EVENTS = ['activity.created', 'activity.updated', 'activity.deleted'] as const;

export let activityEvents = SlateTrigger.create(spec, {
  name: 'Activity Events',
  key: 'activity_events',
  description: 'Triggers when an activity is created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      activityId: z.string().describe('Activity ID'),
      rawPayload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      activityId: z.string().describe('Activity ID'),
      type: z.string().optional().describe('Activity type (call, email, meeting, etc.)'),
      notes: z.string().optional().describe('Activity notes'),
      date: z.string().optional().describe('Activity date'),
      createdAt: z.string().optional().describe('Created date'),
      updatedAt: z.string().optional().describe('Updated date')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhookIds: string[] = [];
      for (let event of ACTIVITY_EVENTS) {
        let result = await client.createWebhook({
          url: ctx.input.webhookBaseUrl,
          event
        });
        let webhookId =
          result?.id?.toString() ?? result?._links?.self?.href?.split('/').pop() ?? '';
        webhookIds.push(webhookId);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details?.webhookIds ?? []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let activityId = data.activity_id?.toString() ?? '';
      let eventType = data.event ?? '';

      return {
        inputs: [
          {
            eventType,
            activityId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let activity: any = {};
      if (ctx.input.eventType !== 'activity.deleted') {
        try {
          activity = await client.getActivity(ctx.input.activityId);
        } catch {
          // Activity may not exist anymore
        }
      }

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.activityId}-${Date.now()}`,
        output: {
          activityId: ctx.input.activityId,
          type: activity.type,
          notes: activity.notes,
          date: activity.date,
          createdAt: activity.created_at,
          updatedAt: activity.updated_at
        }
      };
    }
  })
  .build();
