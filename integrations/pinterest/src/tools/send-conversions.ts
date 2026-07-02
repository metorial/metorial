import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let conversionEventSchema = z.object({
  eventName: z
    .string()
    .describe(
      'Conversion event name (e.g., "checkout", "add_to_cart", "page_visit", "signup", "lead", "search", "view_category", "custom")'
    ),
  actionSource: z
    .enum(['app_android', 'app_ios', 'web', 'offline'])
    .describe('Source of the conversion event'),
  eventTime: z.number().describe('Unix timestamp of the event in seconds'),
  eventId: z.string().describe('Unique ID for this event (used for deduplication)'),
  eventSourceUrl: z.string().optional().describe('URL where the event occurred'),
  partnerName: z.string().optional().describe('Partner name for attribution'),
  userData: z
    .record(z.string(), z.any())
    .describe(
      'User data for matching (e.g., email hashes, phone hashes, client IP, user agent)'
    ),
  customData: z
    .record(z.string(), z.any())
    .optional()
    .describe('Custom data (e.g., currency, value, content_ids, num_items)'),
  appId: z.string().optional().describe('App store ID for mobile events'),
  appName: z.string().optional().describe('App name for mobile events'),
  appVersion: z.string().optional().describe('App version for mobile events'),
  deviceBrand: z.string().optional().describe('Device brand for mobile events'),
  deviceModel: z.string().optional().describe('Device model for mobile events'),
  osVersion: z.string().optional().describe('OS version for mobile events'),
  language: z.string().optional().describe('Language code (e.g., "en")')
});

export let sendConversions = SlateTool.create(spec, {
  name: 'Send Conversions',
  key: 'send_conversions',
  description: `Send conversion events to Pinterest via the Conversions API. Supports web, in-app (Android/iOS), and offline events. Events are automatically deduplicated against the Pinterest Tag.`,
  instructions: [
    'Each event must include eventName, actionSource, eventTime, eventId, and userData.',
    'userData should contain hashed identifiers (SHA-256) for user matching, such as em (email), ph (phone), or client_ip_address.',
    'Use customData to pass transaction details like currency, value, and content_ids.'
  ],
  constraints: [
    'Maximum 1000 events per request.',
    'Events older than 7 days are not accepted.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      adAccountId: z.string().describe('ID of the ad account'),
      events: z
        .array(conversionEventSchema)
        .min(1)
        .describe('List of conversion events to send')
    })
  )
  .output(
    z.object({
      numEventsReceived: z.number().optional().describe('Number of events received'),
      numEventsProcessed: z
        .number()
        .optional()
        .describe('Number of events successfully processed'),
      events: z
        .array(
          z.object({
            status: z.string().optional().describe('Processing status'),
            errorMessage: z.string().optional().describe('Error message if processing failed')
          })
        )
        .optional()
        .describe('Per-event processing results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendConversionEvents(ctx.input.adAccountId, {
      events: ctx.input.events
    });

    return {
      output: {
        numEventsReceived: result.num_events_received,
        numEventsProcessed: result.num_events_processed,
        events: result.events
      },
      message: `Sent **${ctx.input.events.length}** conversion event(s). Received: ${result.num_events_received ?? 'N/A'}, Processed: ${result.num_events_processed ?? 'N/A'}.`
    };
  })
  .build();
