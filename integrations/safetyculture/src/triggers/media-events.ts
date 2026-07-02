import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let mediaEvents = SlateTrigger.create(spec, {
  name: 'Media Uploaded',
  key: 'media_events',
  description:
    'Triggers when image media files are uploaded to SafetyCulture. Only fires for image uploads (not videos or PDFs).'
})
  .input(
    z.object({
      webhookId: z.string().describe('Webhook ID'),
      eventTypes: z.array(z.string()).describe('Event types'),
      resourceId: z.string().describe('Media resource ID'),
      resourceType: z.string().describe('Resource type'),
      triggeredAt: z.string().describe('Timestamp of the event'),
      triggeredByUserId: z.string().optional().describe('User who triggered the event'),
      organisationId: z.string().optional().describe('Organization ID'),
      eventData: z.any().optional().describe('Additional event-specific data')
    })
  )
  .output(
    z.object({
      mediaId: z.string().describe('ID of the uploaded media'),
      triggeredAt: z.string().describe('When the event occurred'),
      triggeredByUserId: z.string().optional().describe('User who uploaded the media'),
      organisationId: z.string().optional().describe('Organization ID'),
      eventData: z.any().optional().describe('Additional event data')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        triggerEvents: ['TRIGGER_EVENT_MEDIA_UPLOADED']
      });

      return {
        registrationDetails: {
          webhookId: result.webhook_id || result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      return {
        inputs: [
          {
            webhookId: data.webhook_id || '',
            eventTypes: data.event?.event_types || [],
            resourceId: data.resource?.id || '',
            resourceType: data.resource?.type || '',
            triggeredAt: data.event?.date_triggered || new Date().toISOString(),
            triggeredByUserId: data.event?.triggered_by?.user,
            organisationId: data.event?.triggered_by?.organization,
            eventData: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'media.uploaded',
        id: `${ctx.input.webhookId}-${ctx.input.resourceId}-${ctx.input.triggeredAt}`,
        output: {
          mediaId: ctx.input.resourceId,
          triggeredAt: ctx.input.triggeredAt,
          triggeredByUserId: ctx.input.triggeredByUserId,
          organisationId: ctx.input.organisationId,
          eventData: ctx.input.eventData
        }
      };
    }
  })
  .build();
