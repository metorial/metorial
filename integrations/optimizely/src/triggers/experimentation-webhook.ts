import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let experimentationWebhook = SlateTrigger.create(spec, {
  name: 'Experimentation Webhook',
  key: 'experimentation_webhook',
  description:
    'Receives webhook events from Optimizely Feature Experimentation, including datafile updates and configuration changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type (e.g., project.datafile_updated)'),
      eventId: z.string().describe('Unique event identifier'),
      projectId: z.string().optional().describe('Project ID'),
      payload: z.any().describe('Full webhook event payload')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Event type'),
      projectId: z.string().optional().describe('Project ID'),
      environmentName: z
        .string()
        .optional()
        .describe('Environment name (for datafile updates)'),
      revision: z.string().optional().describe('Datafile revision number'),
      datafileUrl: z.string().optional().describe('URL to the updated datafile'),
      cdnUrl: z.string().optional().describe('CDN URL for the datafile'),
      timestamp: z.string().optional().describe('When the event occurred'),
      rawEvent: z.any().optional().describe('Full event payload')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event || data.type || 'project.datafile_updated';
      let eventId =
        data.uuid || data.id || `${eventType}-${data.project_id || ''}-${Date.now()}`;
      let projectId = data.project_id ? String(data.project_id) : undefined;

      return {
        inputs: [
          {
            eventType,
            eventId: String(eventId),
            projectId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload;
      return {
        type: ctx.input.eventType.toLowerCase(),
        id: ctx.input.eventId,
        output: {
          eventType: ctx.input.eventType,
          projectId: ctx.input.projectId,
          environmentName: payload.environment_name || payload.environment,
          revision: payload.revision ? String(payload.revision) : undefined,
          datafileUrl: payload.datafile_url || payload.origin_url,
          cdnUrl: payload.cdn_url,
          timestamp: payload.timestamp || new Date().toISOString(),
          rawEvent: payload
        }
      };
    }
  })
  .build();
