import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let assetEvents = SlateTrigger.create(spec, {
  name: 'Creative Cloud Asset Events',
  key: 'asset_events',
  description:
    'Triggers when files or directories are created, updated, or deleted in Creative Cloud Assets storage. Receives webhook notifications from Adobe I/O Events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type identifier'),
      eventId: z.string().describe('Unique event ID'),
      resourceType: z
        .enum(['file', 'directory'])
        .describe('Whether the event is for a file or directory'),
      action: z.enum(['created', 'updated', 'deleted']).describe('The action that occurred'),
      assetPath: z.string().optional().describe('Path of the affected asset'),
      assetUrl: z.string().optional().describe('URL of the affected asset'),
      userId: z.string().optional().describe('User who triggered the event'),
      timestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      assetPath: z.string().optional().describe('Path of the affected file or directory'),
      assetUrl: z.string().optional().describe('URL of the affected file or directory'),
      resourceType: z.string().describe('Whether the event is for a file or directory'),
      action: z.string().describe('The action that occurred (created, updated, deleted)'),
      userId: z.string().optional().describe('User who triggered the event'),
      timestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Adobe I/O Events can send a challenge for webhook verification
      if (body.challenge) {
        return { inputs: [] };
      }

      let events = Array.isArray(body) ? body : body.event ? [body] : [body];

      let inputs = events.map((event: any) => {
        let eventData = event.event || event;
        let activityType =
          eventData.activitystreams_activity?.type ||
          eventData['@type'] ||
          eventData.type ||
          '';
        let objectType =
          eventData.activitystreams_activity?.object?.type ||
          eventData.activitystreams_object?.type ||
          '';

        let action: 'created' | 'updated' | 'deleted' = 'updated';
        if (
          activityType.toLowerCase().includes('create') ||
          activityType.toLowerCase().includes('add')
        ) {
          action = 'created';
        } else if (
          activityType.toLowerCase().includes('delete') ||
          activityType.toLowerCase().includes('remove')
        ) {
          action = 'deleted';
        }

        let resourceType: 'file' | 'directory' = 'file';
        if (
          objectType.toLowerCase().includes('directory') ||
          objectType.toLowerCase().includes('folder') ||
          objectType.toLowerCase().includes('collection')
        ) {
          resourceType = 'directory';
        }

        return {
          eventType: activityType,
          eventId: eventData.event_id || eventData.id || `${Date.now()}-${Math.random()}`,
          resourceType,
          action,
          assetPath:
            eventData.activitystreams_activity?.object?.id ||
            eventData.activitystreams_object?.id ||
            eventData.xdmAsset?.path,
          assetUrl:
            eventData.activitystreams_activity?.object?.url ||
            eventData.activitystreams_object?.url ||
            eventData.xdmAsset?.asset_id,
          userId:
            eventData.activitystreams_activity?.actor?.id ||
            eventData.userId ||
            eventData.user_id,
          timestamp:
            eventData.activitystreams_activity?.published ||
            eventData.timestamp ||
            eventData.created_at
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `${ctx.input.resourceType}.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          assetPath: ctx.input.assetPath,
          assetUrl: ctx.input.assetUrl,
          resourceType: ctx.input.resourceType,
          action: ctx.input.action,
          userId: ctx.input.userId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
