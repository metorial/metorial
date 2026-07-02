import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { VimeoClient } from '../lib/client';
import { mapVideo, videoSchema } from '../lib/schemas';
import { spec } from '../spec';

export let videoEventsTrigger = SlateTrigger.create(spec, {
  name: 'Video Events',
  key: 'video_events',
  description:
    'Receive real-time notifications when videos are uploaded, played, or have status changes on Vimeo.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of video event'),
      eventId: z.string().describe('Unique event identifier'),
      video: z.any().optional().describe('Video data from the event payload'),
      rawPayload: z.any().describe('Full raw webhook payload')
    })
  )
  .output(
    videoSchema.partial().extend({
      videoId: z.string().describe('Vimeo video ID')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new VimeoClient(ctx.auth.token);
      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, [
        'video.upload.complete',
        'video.play'
      ]);

      let webhookId = webhook.uri?.replace(/.*\/webhooks\//, '') ?? '';

      return {
        registrationDetails: {
          webhookId,
          webhookUri: webhook.uri
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new VimeoClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let eventType = data.event_type ?? data.type ?? 'unknown';
      let video = data.video ?? data.clip ?? data.event?.video ?? null;
      let videoId = video?.uri?.replace('/videos/', '') ?? '';
      let eventId = `${eventType}-${videoId}-${data.created_time ?? Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            video,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let video = ctx.input.video;
      let mapped = video
        ? mapVideo(video)
        : {
            videoId: '',
            uri: '',
            name: '',
            description: null,
            link: '',
            duration: 0,
            createdTime: '',
            modifiedTime: '',
            status: 'unknown'
          };

      // If minimal data came with the webhook, try to fetch full video details
      if (video && (!mapped.name || mapped.name === '') && mapped.videoId) {
        try {
          let client = new VimeoClient(ctx.auth.token);
          let fullVideo = await client.getVideo(mapped.videoId);
          mapped = mapVideo(fullVideo);
        } catch {
          // Use what we have
        }
      }

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: mapped
      };
    }
  })
  .build();
