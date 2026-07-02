import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let consumerWebhook = SlateTrigger.create(spec, {
  name: 'TikTok Developer Events',
  key: 'consumer_webhook',
  description:
    'Receives webhook notifications from TikTok for Developers. Covers authorization events (user deauthorized), video events (upload failed, publish completed), and data portability events (download ready). Configure your callback URL in the TikTok Developer Portal.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The type of event (e.g. authorization.removed, video.upload.failed, video.publish.completed, portability.download.ready).'
        ),
      eventId: z.string().describe('Unique identifier for this event delivery.'),
      userId: z.string().optional().describe('Open ID of the affected user.'),
      payload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Raw event payload from TikTok.')
    })
  )
  .output(
    z.object({
      userId: z.string().optional().describe('Open ID of the affected user.'),
      publishId: z.string().optional().describe('Publish ID for video-related events.'),
      failReason: z.string().optional().describe('Failure reason for upload/publish errors.'),
      downloadUrl: z.string().optional().describe('Download URL for data portability events.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: Record<string, any>;
      try {
        body = (await ctx.request.json()) as Record<string, any>;
      } catch {
        return { inputs: [] };
      }

      let eventType = body.event ?? body.type ?? 'unknown';
      let eventId = body.log_id ?? body.event_id ?? `${eventType}-${Date.now()}`;
      let userId = body.user_open_id ?? body.open_id;

      return {
        inputs: [
          {
            eventType,
            eventId: String(eventId),
            userId: userId ? String(userId) : undefined,
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload ?? {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          userId: ctx.input.userId,
          publishId: payload.publish_id ? String(payload.publish_id) : undefined,
          failReason: payload.fail_reason ? String(payload.fail_reason) : undefined,
          downloadUrl: payload.download_url ? String(payload.download_url) : undefined
        }
      };
    }
  })
  .build();
