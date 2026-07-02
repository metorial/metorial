import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let cloudDocumentEvents = SlateTrigger.create(spec, {
  name: 'Cloud Document Events',
  key: 'cloud_document_events',
  description:
    'Triggers when cloud documents (Photoshop, Illustrator, or XD) are created, updated, or deleted. Receives webhook notifications from Adobe I/O Events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type identifier'),
      eventId: z.string().describe('Unique event ID'),
      action: z.enum(['created', 'updated', 'deleted']).describe('The action that occurred'),
      documentId: z.string().optional().describe('ID of the affected cloud document'),
      documentName: z.string().optional().describe('Name of the affected cloud document'),
      application: z
        .string()
        .optional()
        .describe('Application type (Photoshop, Illustrator, XD)'),
      userId: z.string().optional().describe('User who triggered the event'),
      timestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      documentId: z.string().optional().describe('ID of the affected cloud document'),
      documentName: z.string().optional().describe('Name of the affected cloud document'),
      application: z
        .string()
        .optional()
        .describe('Application type (Photoshop, Illustrator, XD)'),
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

        let provider = eventData.recipient?.provider || eventData.provider || '';
        let application = 'unknown';
        if (
          provider.toLowerCase().includes('photoshop') ||
          provider.toLowerCase().includes('psdc')
        ) {
          application = 'Photoshop';
        } else if (
          provider.toLowerCase().includes('illustrator') ||
          provider.toLowerCase().includes('aidc')
        ) {
          application = 'Illustrator';
        } else if (provider.toLowerCase().includes('xd')) {
          application = 'XD';
        }

        return {
          eventType: activityType,
          eventId: eventData.event_id || eventData.id || `${Date.now()}-${Math.random()}`,
          action,
          documentId:
            eventData.activitystreams_activity?.object?.id ||
            eventData.activitystreams_object?.id ||
            eventData.xdmAsset?.asset_id,
          documentName:
            eventData.activitystreams_activity?.object?.name ||
            eventData.activitystreams_object?.name,
          application,
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
        type: `cloud_document.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          documentId: ctx.input.documentId,
          documentName: ctx.input.documentName,
          application: ctx.input.application,
          action: ctx.input.action,
          userId: ctx.input.userId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
