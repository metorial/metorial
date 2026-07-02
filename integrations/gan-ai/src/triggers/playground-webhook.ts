import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let playgroundWebhook = SlateTrigger.create(spec, {
  name: 'Playground Events',
  key: 'playground_events',
  description:
    'Receives webhook events from the Playground API for avatar status changes, avatar video generation completions, and lip-sync video completions. Register this webhook URL when creating avatars or lip-sync jobs.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Event type: avatar, avatar_inference, or lipsync_inference'),
      resourceId: z.string().describe('The avatar ID or inference ID related to this event'),
      status: z.string().describe('Current status of the resource'),
      rawPayload: z.any().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('The avatar ID or inference ID'),
      status: z.string().describe('Current status of the resource'),
      eventType: z.string().describe('Type of event that occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;
      let eventType = (data.event_type as string) || 'unknown';
      let eventData = (data.data as Record<string, unknown>) || {};

      let resourceId = '';
      let status = '';

      if (eventType === 'avatar') {
        resourceId = (eventData.avatar_id as string) || '';
        status = (eventData.status as string) || '';
      } else if (eventType === 'avatar_inference') {
        resourceId = (eventData.inference_id as string) || '';
        status = (eventData.status as string) || '';
      } else if (eventType === 'lipsync_inference') {
        resourceId = (eventData.inference_id as string) || '';
        status = (eventData.status as string) || '';
      }

      return {
        inputs: [
          {
            eventType,
            resourceId,
            status,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, resourceId, status } = ctx.input;

      let type = 'unknown';
      if (eventType === 'avatar') {
        type = `avatar.${status}`;
      } else if (eventType === 'avatar_inference') {
        type = `avatar_inference.${status}`;
      } else if (eventType === 'lipsync_inference') {
        type = `lipsync_inference.${status}`;
      }

      return {
        type,
        id: `${eventType}_${resourceId}_${status}_${Date.now()}`,
        output: {
          resourceId,
          status,
          eventType
        }
      };
    }
  })
  .build();
