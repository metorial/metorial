import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadEvents = SlateTrigger.create(spec, {
  name: 'Upload Events',
  key: 'upload_events',
  description: 'Triggers when media assets (uploads) are created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.enum(['create', 'update', 'delete']).describe('Type of upload event'),
      entity: z.any().describe('The upload entity data'),
      previousEntity: z
        .any()
        .optional()
        .describe('Previous state of the upload (for update events)'),
      environment: z.string().optional().describe('Environment where the event occurred'),
      siteId: z.string().optional().describe('Project site ID'),
      webhookCallId: z.string().optional().describe('Unique webhook call identifier'),
      eventTriggeredAt: z.string().optional().describe('Timestamp when the event occurred')
    })
  )
  .output(
    z.object({
      uploadId: z.string().describe('ID of the affected upload'),
      filename: z.string().optional().describe('Filename of the upload'),
      mimeType: z.string().optional().describe('MIME type of the upload'),
      environment: z.string().optional().describe('Environment where the event occurred'),
      upload: z.any().describe('The upload data'),
      previousUpload: z.any().optional().describe('Previous upload state (for update events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      let webhook = await client.createWebhook({
        name: `Slates Upload Events - ${Date.now()}`,
        url: ctx.input.webhookBaseUrl,
        headers: {},
        events: [
          {
            entity_type: 'upload',
            event_types: ['create', 'update', 'delete']
          }
        ],
        enabled: true,
        payload_api_version: '3',
        auto_retry: true
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (!data || data.entity_type !== 'upload') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: data.event_type,
            entity: data.entity,
            previousEntity: data.previous_entity,
            environment: data.environment,
            siteId: data.site_id,
            webhookCallId: data.webhook_call_id,
            eventTriggeredAt: data.event_triggered_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let entity = ctx.input.entity || {};

      return {
        type: `upload.${ctx.input.eventType}`,
        id:
          ctx.input.webhookCallId ||
          `${entity.id}-${ctx.input.eventType}-${ctx.input.eventTriggeredAt || Date.now()}`,
        output: {
          uploadId: entity.id || '',
          filename: entity.filename,
          mimeType: entity.mime_type,
          environment: ctx.input.environment,
          upload: entity,
          previousUpload: ctx.input.previousEntity
        }
      };
    }
  })
  .build();
