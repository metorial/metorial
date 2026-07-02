import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let eventWebhookTrigger = SlateTrigger.create(spec, {
  name: 'Event Webhook',
  key: 'event_webhook',
  description:
    'Receives events and user updates from Amplitude via webhook integration. Configure the webhook URL in Amplitude under Data Destinations > Webhooks.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of the event or "user_update" for user property changes.'),
      eventId: z.string().describe('Unique identifier for the event.'),
      userId: z.string().optional().describe('User ID associated with the event.'),
      deviceId: z.string().optional().describe('Device ID associated with the event.'),
      timestamp: z.string().optional().describe('ISO timestamp of the event.'),
      eventProperties: z.record(z.string(), z.any()).optional().describe('Event properties.'),
      userProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('User properties at time of event.'),
      rawPayload: z.any().optional().describe('Full raw webhook payload.')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Type of the Amplitude event.'),
      userId: z.string().optional().describe('User ID.'),
      deviceId: z.string().optional().describe('Device ID.'),
      timestamp: z.string().optional().describe('ISO timestamp of the event.'),
      eventProperties: z.record(z.string(), z.any()).optional().describe('Event properties.'),
      userProperties: z.record(z.string(), z.any()).optional().describe('User properties.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let contentType = ctx.request.headers.get('content-type') ?? '';
      let data: any;

      if (contentType.includes('application/json')) {
        data = await ctx.request.json();
      } else {
        let text = await ctx.request.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text };
        }
      }

      // Amplitude webhook can send single events or arrays
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any, index: number) => {
        let eventType = event.event_type ?? event.eventType ?? 'unknown';
        let userId = event.user_id ?? event.userId;
        let deviceId = event.device_id ?? event.deviceId;
        let eventTime = event.event_time ?? event.time ?? event.timestamp;
        let insertId = event.insert_id ?? event.$insert_id;

        // Generate a unique ID for deduplication
        let eventId =
          insertId ??
          `${userId ?? deviceId ?? 'anon'}-${eventType}-${eventTime ?? index}-${Date.now()}`;

        return {
          eventType,
          eventId: String(eventId),
          userId,
          deviceId,
          timestamp: eventTime ? String(eventTime) : undefined,
          eventProperties: event.event_properties ?? event.eventProperties,
          userProperties: event.user_properties ?? event.userProperties,
          rawPayload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let isUserUpdate =
        ctx.input.eventType === '$identify' || ctx.input.eventType === 'user_update';
      let type = isUserUpdate
        ? 'user.updated'
        : `event.${ctx.input.eventType.toLowerCase().replace(/\s+/g, '_')}`;

      return {
        type,
        id: ctx.input.eventId,
        output: {
          eventType: ctx.input.eventType,
          userId: ctx.input.userId,
          deviceId: ctx.input.deviceId,
          timestamp: ctx.input.timestamp,
          eventProperties: ctx.input.eventProperties,
          userProperties: ctx.input.userProperties
        }
      };
    }
  })
  .build();
