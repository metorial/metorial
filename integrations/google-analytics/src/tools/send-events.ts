import { SlateTool } from 'slates';
import { z } from 'zod';
import { MeasurementProtocolClient } from '../lib/client';
import {
  apiSecretSchema,
  measurementIdSchema,
  resolveMeasurementProtocolCredentials
} from '../lib/measurement-protocol';
import { spec } from '../spec';

export let sendEvents = SlateTool.create(spec, {
  name: 'Send Events',
  key: 'send_events',
  description: `Send event data to Google Analytics 4 via the Measurement Protocol. Use this to record server-side interactions, offline conversions, or events from non-web/app contexts (e.g., kiosks, POS systems, CRM triggers).

The Measurement Protocol supplements automatic data collection — it does not replace gtag, Tag Manager, or Firebase.`,
  instructions: [
    "A clientId is required to associate events with a user/device. Generate a UUID if you don't have one from an existing GA4 cookie.",
    'Optionally provide a userId to tie events to a known user across devices.',
    'If measurementId is supplied by the user or configured for the integration, call this tool directly with that measurement ID.',
    'For OAuth connections without a known measurementId, first use manage_data_streams with action "list" or "get" to select a web stream and read webStreamData.measurementId.',
    'Pass apiSecret from manage_data_streams action "list_secrets" or "create_secret". Measurement Protocol Only auth can provide measurementId and apiSecret as a fallback.'
  ],
  constraints: [
    'Maximum of 25 events per request.',
    'Each event name must be 40 characters or fewer.',
    'Event parameter names must be 40 characters or fewer.',
    'Event parameter string values must be 100 characters or fewer.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      measurementId: measurementIdSchema,
      apiSecret: apiSecretSchema,
      clientId: z
        .string()
        .describe(
          'A unique client identifier. Use the GA4 client_id cookie value, or generate a UUID for server-side events.'
        ),
      userId: z
        .string()
        .optional()
        .describe(
          'Optional known user ID to associate events with a logged-in user across devices.'
        ),
      events: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                'Event name (e.g., "purchase", "sign_up", "generate_lead"). Must be 40 chars or fewer.'
              ),
            params: z
              .record(z.string(), z.any())
              .optional()
              .describe(
                'Key-value pairs of event parameters (e.g., { "value": 25.00, "currency": "USD" }).'
              )
          })
        )
        .min(1)
        .max(25)
        .describe('Array of events to send. 1 to 25 events per request.'),
      userProperties: z
        .record(
          z.string(),
          z.object({
            value: z.any().describe('The property value.')
          })
        )
        .optional()
        .describe(
          'User properties to set (e.g., { "membership_tier": { "value": "gold" } }).'
        ),
      consent: z
        .object({
          adUserData: z
            .enum(['GRANTED', 'DENIED'])
            .optional()
            .describe('Consent for ad-related user data.'),
          adPersonalization: z
            .enum(['GRANTED', 'DENIED'])
            .optional()
            .describe('Consent for ad personalization.')
        })
        .optional()
        .describe('Consent settings for the events.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the events were sent successfully.'),
      eventCount: z.number().describe('Number of events sent.')
    })
  )
  .handleInvocation(async ctx => {
    let credentials = resolveMeasurementProtocolCredentials(ctx.input, ctx.config, ctx.auth);

    let client = new MeasurementProtocolClient({
      measurementId: credentials.measurementId,
      apiSecret: credentials.apiSecret
    });

    await client.sendEvents({
      clientId: ctx.input.clientId,
      userId: ctx.input.userId,
      events: ctx.input.events,
      userProperties: ctx.input.userProperties as Record<string, { value: any }> | undefined,
      consent: ctx.input.consent
    });

    let eventNames = ctx.input.events.map(e => e.name).join(', ');

    return {
      output: {
        success: true,
        eventCount: ctx.input.events.length
      },
      message: `Successfully sent **${ctx.input.events.length}** event(s): ${eventNames}.`
    };
  })
  .build();
