import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let fileEvents = SlateTrigger.create(spec, {
  name: 'File Events',
  key: 'file_events',
  description:
    'Triggered when files are uploaded, stored, deleted, infected, or have their info updated in your Uploadcare project.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Event type (e.g. file.uploaded, file.stored, file.deleted, file.infected, file.info_updated)'
        ),
      hookId: z.number().describe('Webhook ID that fired this event'),
      fileId: z.string().describe('UUID of the affected file'),
      fileData: z.any().describe('Full file data from the webhook payload'),
      initiator: z.any().nullable().describe('Source/cause of the event')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('UUID of the affected file'),
      originalFilename: z.string().describe('Original filename'),
      size: z.number().describe('File size in bytes'),
      mimeType: z.string().describe('MIME type of the file'),
      isImage: z.boolean().describe('Whether the file is an image'),
      isReady: z.boolean().describe('Whether the file is fully processed'),
      datetimeUploaded: z.string().describe('ISO 8601 upload timestamp'),
      datetimeStored: z.string().nullable().describe('ISO 8601 store timestamp'),
      datetimeRemoved: z.string().nullable().describe('ISO 8601 removal timestamp'),
      originalFileUrl: z.string().nullable().describe('CDN URL of the original file'),
      metadata: z.record(z.string(), z.string()).optional().describe('User-defined metadata'),
      initiatorType: z
        .string()
        .optional()
        .describe('What triggered the event (e.g. api, addon, system)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth);

      let events = [
        'file.uploaded',
        'file.stored',
        'file.deleted',
        'file.infected',
        'file.info_updated'
      ];

      let registeredWebhooks: Array<{ webhookId: number; event: string }> = [];

      for (let event of events) {
        let webhook = await client.createWebhook({
          targetUrl: ctx.input.webhookBaseUrl,
          event,
          isActive: true
        });
        registeredWebhooks.push({ webhookId: webhook.id, event: webhook.event });
      }

      return {
        registrationDetails: { webhooks: registeredWebhooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(ctx.auth);
      let details = ctx.input.registrationDetails as {
        webhooks: Array<{ webhookId: number; event: string }>;
      };

      if (details?.webhooks) {
        // Delete using target_url which removes all webhooks pointed at this URL
        await client.deleteWebhook(ctx.input.webhookBaseUrl);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.hook?.event || 'unknown';
      let hookId = data.hook?.id || 0;
      let fileData = data.data || {};
      let fileId = fileData.uuid || '';

      return {
        inputs: [
          {
            eventType,
            hookId,
            fileId,
            fileData,
            initiator: data.initiator || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let file = ctx.input.fileData;

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.fileId}-${ctx.input.eventType}-${ctx.input.hookId}-${Date.now()}`,
        output: {
          fileId: ctx.input.fileId,
          originalFilename: file.original_filename || '',
          size: file.size || 0,
          mimeType: file.mime_type || '',
          isImage: file.is_image || false,
          isReady: file.is_ready || false,
          datetimeUploaded: file.datetime_uploaded || '',
          datetimeStored: file.datetime_stored || null,
          datetimeRemoved: file.datetime_removed || null,
          originalFileUrl: file.original_file_url || null,
          metadata: file.metadata || undefined,
          initiatorType: ctx.input.initiator?.type || undefined
        }
      };
    }
  })
  .build();
