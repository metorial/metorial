import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let libraryEvents = SlateTrigger.create(spec, {
  name: 'Creative Cloud Library Events',
  key: 'library_events',
  description:
    'Triggers when Creative Cloud Libraries are created, updated, or deleted. Library updates include adding, modifying, or removing elements within a library. Receives webhook notifications from Adobe I/O Events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type identifier'),
      eventId: z.string().describe('Unique event ID'),
      action: z.enum(['created', 'updated', 'deleted']).describe('The action that occurred'),
      libraryId: z.string().optional().describe('ID of the affected library'),
      libraryName: z.string().optional().describe('Name of the affected library'),
      userId: z.string().optional().describe('User who triggered the event'),
      timestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      libraryId: z.string().optional().describe('ID of the affected library'),
      libraryName: z.string().optional().describe('Name of the affected library'),
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

        return {
          eventType: activityType,
          eventId: eventData.event_id || eventData.id || `${Date.now()}-${Math.random()}`,
          action,
          libraryId:
            eventData.activitystreams_activity?.object?.id ||
            eventData.activitystreams_object?.id ||
            eventData.xdmEntity?.library_id,
          libraryName:
            eventData.activitystreams_activity?.object?.name ||
            eventData.activitystreams_object?.name,
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
        type: `library.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          libraryId: ctx.input.libraryId,
          libraryName: ctx.input.libraryName,
          action: ctx.input.action,
          userId: ctx.input.userId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
