import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

let ALL_WEBHOOK_EVENTS = [
  'avatar_video.success',
  'avatar_video.fail',
  'video_agent.success',
  'video_agent.fail',
  'video_translate.success',
  'video_translate.fail',
  'personalized_video'
];

export let videoEvents = SlateTrigger.create(spec, {
  name: 'Video Events',
  key: 'video_events',
  description:
    'Triggers on HeyGen video lifecycle events including avatar video completion/failure, video agent completion/failure, video translation completion/failure, and personalized video updates.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of event (e.g. avatar_video.success, video_translate.fail)'),
      eventId: z.string().describe('Unique event identifier'),
      videoId: z.string().optional().describe('Video ID associated with the event'),
      videoUrl: z.string().optional().describe('URL of the completed video'),
      gifUrl: z.string().optional().describe('URL of the GIF preview'),
      shareUrl: z.string().optional().describe('Share page URL'),
      callbackId: z
        .string()
        .optional()
        .describe('Custom callback ID if provided during creation'),
      errorMessage: z.string().optional().describe('Error message if the event is a failure'),
      rawPayload: z.record(z.string(), z.any()).optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      videoId: z.string().optional().describe('Video ID associated with the event'),
      videoUrl: z.string().optional().describe('URL of the completed video'),
      gifUrl: z.string().optional().describe('URL of the GIF preview'),
      shareUrl: z.string().optional().describe('Share page URL'),
      callbackId: z.string().optional().describe('Custom callback ID'),
      errorMessage: z.string().optional().describe('Error message if event is a failure'),
      rawPayload: z.record(z.string(), z.any()).optional().describe('Full raw event payload')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new HeyGenClient({ token: ctx.auth.token });

      let result = await client.addWebhookEndpoint({
        url: ctx.input.webhookBaseUrl,
        events: ALL_WEBHOOK_EVENTS
      });

      return {
        registrationDetails: {
          endpointId: result.endpointId,
          secret: result.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new HeyGenClient({ token: ctx.auth.token });

      let details = ctx.input.registrationDetails as { endpointId: string };
      if (details?.endpointId) {
        await client.deleteWebhookEndpoint(details.endpointId);
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, any>;

      let eventType = (body.event_type as string) || 'unknown';
      let eventData = (body.event_data as Record<string, any>) || {};

      let eventId =
        eventData.video_id ||
        eventData.video_translate_id ||
        eventData.callback_id ||
        `${eventType}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId: `${eventType}-${eventId}`,
            videoId: eventData.video_id || eventData.video_translate_id,
            videoUrl: eventData.video_url,
            gifUrl: eventData.gif_url,
            shareUrl: eventData.share_url,
            callbackId: eventData.callback_id,
            errorMessage: eventData.message || eventData.error,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          videoId: ctx.input.videoId,
          videoUrl: ctx.input.videoUrl,
          gifUrl: ctx.input.gifUrl,
          shareUrl: ctx.input.shareUrl,
          callbackId: ctx.input.callbackId,
          errorMessage: ctx.input.errorMessage,
          rawPayload: ctx.input.rawPayload
        }
      };
    }
  })
  .build();
