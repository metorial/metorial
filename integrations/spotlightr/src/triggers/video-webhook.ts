import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let videoWebhook = SlateTrigger.create(spec, {
  name: 'Video Webhook',
  key: 'video_webhook',
  description:
    'Receives webhook events from Spotlightr, including lead capture (optin) submissions and video watch notifications. Configure the webhook URL in Spotlightr under App Settings > Integrations > Webhook.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of webhook event received.'),
      eventId: z.string().describe('Unique identifier for this event.'),
      webhookPayload: z
        .record(z.string(), z.any())
        .describe('Raw webhook payload from Spotlightr.')
    })
  )
  .output(
    z.object({
      videoId: z.string().optional().describe('ID of the video associated with the event.'),
      videoName: z
        .string()
        .optional()
        .describe('Name of the video associated with the event.'),
      viewerEmail: z.string().optional().describe('Email address of the viewer, if captured.'),
      viewerName: z.string().optional().describe('Name of the viewer, if captured.'),
      percentWatched: z
        .number()
        .optional()
        .describe('Percentage of the video watched, if applicable.'),
      rawData: z.record(z.string(), z.any()).describe('Full event data from the webhook.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        try {
          let text = await ctx.request.text();
          let params = new URLSearchParams(text);
          data = Object.fromEntries(params.entries());
        } catch {
          data = {};
        }
      }

      let eventType = 'unknown';
      if (data.email || data.optin || data.leadCapture) {
        eventType = 'lead_capture';
      } else if (data.watched || data.percentWatched || data.videoWatched) {
        eventType = 'video_watched';
      } else if (data.event) {
        eventType = String(data.event);
      }

      let eventId =
        data.id ||
        data.eventId ||
        data.viewId ||
        `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

      return {
        inputs: [
          {
            eventType,
            eventId: String(eventId),
            webhookPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.webhookPayload;

      return {
        type: `video.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          videoId: payload.videoId || payload.video_id || payload.videoID,
          videoName: payload.videoName || payload.video_name || payload.name,
          viewerEmail: payload.email || payload.viewerEmail,
          viewerName:
            payload.viewerName || payload.viewer_name || payload.firstName || payload.name,
          percentWatched:
            payload.percentWatched !== undefined ? Number(payload.percentWatched) : undefined,
          rawData: payload
        }
      };
    }
  })
  .build();
