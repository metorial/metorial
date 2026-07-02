import { SlateTool } from 'slates';
import { z } from 'zod';
import { AmplitudeClient } from '../lib/client';
import { spec } from '../spec';

let eventSchema = z.object({
  userId: z
    .string()
    .optional()
    .describe('User ID for the event. At least one of userId or deviceId is required.'),
  deviceId: z
    .string()
    .optional()
    .describe('Device ID for the event. At least one of userId or deviceId is required.'),
  eventType: z
    .string()
    .describe('Name of the event type (e.g., "Button Clicked", "Page Viewed").'),
  time: z
    .number()
    .optional()
    .describe(
      'Timestamp of the event in milliseconds since epoch. Defaults to server upload time.'
    ),
  eventProperties: z
    .record(z.string(), z.any())
    .optional()
    .describe('Key-value pairs of event-specific properties.'),
  userProperties: z
    .record(z.string(), z.any())
    .optional()
    .describe('Key-value pairs of user properties to set with this event.'),
  groups: z
    .record(z.string(), z.any())
    .optional()
    .describe('Groups the user belongs to (group type -> group name).'),
  appVersion: z.string().optional().describe('App version of the client.'),
  platform: z
    .string()
    .optional()
    .describe('Platform of the device (e.g., "iOS", "Android", "Web").'),
  osName: z.string().optional().describe('OS name (e.g., "ios", "android").'),
  osVersion: z.string().optional().describe('OS version.'),
  country: z.string().optional().describe('Country of the user.'),
  city: z.string().optional().describe('City of the user.'),
  language: z.string().optional().describe('Language setting of the user.'),
  price: z.number().optional().describe('Price of the item purchased (for revenue events).'),
  quantity: z.number().optional().describe('Quantity of items purchased.'),
  revenue: z.number().optional().describe('Revenue amount (price * quantity).'),
  productId: z.string().optional().describe('Product identifier for revenue tracking.'),
  revenueType: z.string().optional().describe('Revenue type (e.g., "purchase", "refund").'),
  ip: z
    .string()
    .optional()
    .describe('IP address for geo-lookup. Use "$remote" for server IP.'),
  insertId: z
    .string()
    .optional()
    .describe(
      'Unique ID for deduplication. Events with the same insertId within 7 days are deduplicated.'
    ),
  sessionId: z
    .number()
    .optional()
    .describe('Session ID to group events in a session. Use -1 to mark out-of-session.')
});

export let trackEventsTool = SlateTool.create(spec, {
  name: 'Track Events',
  key: 'track_events',
  description: `Send one or more events to Amplitude for analytics tracking. Supports all standard Amplitude event fields including user properties, event properties, revenue data, and device metadata. Use the batch mode for high-volume ingestion (>1000 events/second).`,
  constraints: [
    'Each event must have at least a userId or deviceId.',
    'Maximum of 2000 events per request for HTTP V2 API.',
    'Event type names are case-sensitive.',
    'insertId enables deduplication: events with the same insertId within 7 days are ignored.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      events: z.array(eventSchema).min(1).describe('Array of events to track.'),
      useBatchApi: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Use the Batch API for high-volume ingestion. Offers higher throughput with eventual consistency.'
        ),
      minIdLength: z
        .number()
        .optional()
        .describe('Minimum length for user_id and device_id fields. Overrides server default.')
    })
  )
  .output(
    z.object({
      code: z.number().describe('Response status code from Amplitude.'),
      eventsIngested: z
        .number()
        .optional()
        .describe('Number of events successfully ingested.'),
      payloadSizeBytes: z
        .number()
        .optional()
        .describe('Size of the request payload in bytes.'),
      serverUploadTime: z.number().optional().describe('Server upload time in milliseconds.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AmplitudeClient({
      apiKey: ctx.auth.apiKey,
      secretKey: ctx.auth.secretKey,
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result: any;
    if (ctx.input.useBatchApi) {
      result = await client.batchTrackEvents(ctx.input.events, {
        minIdLength: ctx.input.minIdLength
      });
    } else {
      result = await client.trackEvents(ctx.input.events, {
        minIdLength: ctx.input.minIdLength
      });
    }

    let eventsCount = ctx.input.events.length;
    return {
      output: {
        code: result.code ?? 200,
        eventsIngested: result.events_ingested ?? eventsCount,
        payloadSizeBytes: result.payload_size_bytes,
        serverUploadTime: result.server_upload_time
      },
      message: `Successfully tracked **${eventsCount}** event(s) via ${ctx.input.useBatchApi ? 'Batch' : 'HTTP V2'} API.`
    };
  })
  .build();
