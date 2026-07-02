import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let mediaEvents = SlateTrigger.create(spec, {
  name: 'Media Events',
  key: 'media_events',
  description:
    'Triggered when media files are uploaded, updated, or deleted. Configure a webhook in Strapi (Settings → Webhooks) pointing to the provided URL and select the media events to listen for.'
})
  .input(
    z.object({
      event: z
        .string()
        .describe('The event type (e.g., "media.create", "media.update", "media.delete")'),
      mediaData: z.record(z.string(), z.any()).describe('The media file data'),
      createdAt: z.string().describe('Timestamp of the event')
    })
  )
  .output(
    z.object({
      mediaId: z.string().optional().describe('ID of the affected media file'),
      name: z.string().optional().describe('Name of the media file'),
      url: z.string().optional().describe('URL of the media file'),
      mime: z.string().optional().describe('MIME type of the media file'),
      mediaData: z.record(z.string(), z.any()).describe('Full media file data'),
      createdAt: z.string().describe('Timestamp of the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let event = body?.event ?? '';
      let media = body?.media ?? {};
      let createdAt = body?.createdAt ?? new Date().toISOString();

      return {
        inputs: [
          {
            event,
            mediaData: media,
            createdAt
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.event || 'media.unknown';
      let mediaId = ctx.input.mediaData?.id?.toString();
      let uniqueId = `${eventType}-${mediaId ?? 'unknown'}-${ctx.input.createdAt}`;

      return {
        type: eventType,
        id: uniqueId,
        output: {
          mediaId,
          name: ctx.input.mediaData?.name,
          url: ctx.input.mediaData?.url,
          mime: ctx.input.mediaData?.mime,
          mediaData: ctx.input.mediaData,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
