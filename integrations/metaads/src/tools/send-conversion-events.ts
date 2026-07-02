import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetaAdsClient } from '../lib/client';
import { spec } from '../spec';

let userDataSchema = z
  .object({
    em: z.array(z.string()).optional().describe('SHA-256 hashed email addresses'),
    ph: z.array(z.string()).optional().describe('SHA-256 hashed phone numbers'),
    fn: z.string().optional().describe('SHA-256 hashed first name'),
    ln: z.string().optional().describe('SHA-256 hashed last name'),
    ge: z.string().optional().describe('SHA-256 hashed gender (f or m)'),
    db: z.string().optional().describe('SHA-256 hashed date of birth (YYYYMMDD)'),
    ct: z.string().optional().describe('SHA-256 hashed city'),
    st: z.string().optional().describe('SHA-256 hashed state/province'),
    zp: z.string().optional().describe('SHA-256 hashed zip/postal code'),
    country: z.string().optional().describe('SHA-256 hashed 2-letter country code'),
    externalId: z.string().optional().describe('Advertiser-assigned user ID'),
    clientIpAddress: z.string().optional().describe('Client IP address'),
    clientUserAgent: z.string().optional().describe('Client user agent string'),
    fbc: z.string().optional().describe('Facebook click ID (_fbc cookie)'),
    fbp: z.string().optional().describe('Facebook browser ID (_fbp cookie)')
  })
  .describe('User identification data for matching');

let eventSchema = z.object({
  eventName: z
    .string()
    .describe(
      'Event name (e.g., Purchase, AddToCart, Lead, ViewContent, CompleteRegistration, InitiateCheckout, Search, AddPaymentInfo, Contact, Subscribe)'
    ),
  eventTime: z.number().describe('Unix timestamp of when the event occurred'),
  eventId: z
    .string()
    .optional()
    .describe('Unique event ID for deduplication with browser pixel'),
  eventSourceUrl: z
    .string()
    .optional()
    .describe('URL where the event occurred (required for web events)'),
  actionSource: z
    .enum([
      'website',
      'app',
      'email',
      'phone_call',
      'chat',
      'physical_store',
      'system_generated',
      'other'
    ])
    .describe('Where the conversion occurred'),
  userData: userDataSchema,
  customData: z
    .record(z.string(), z.any())
    .optional()
    .describe(
      'Additional event data (e.g., { currency: "USD", value: 49.99, content_ids: ["product1"], content_type: "product" })'
    )
});

export let sendConversionEvents = SlateTool.create(spec, {
  name: 'Send Conversion Events',
  key: 'send_conversion_events',
  description: `Send server-side conversion events via the Conversions API. This is the server-side alternative to Meta Pixel for tracking purchases, leads, and other conversions. Supports deduplication with browser-based pixel events via eventId.

Events are sent to a dataset/pixel ID and used for ad optimization, targeting, and measurement.`,
  instructions: [
    'At least one user data parameter is required for attribution. Include as many as possible for better match quality.',
    'For web events, eventSourceUrl and clientUserAgent are required.',
    'Use eventId for deduplication when also sending events via Meta Pixel.',
    'PII fields must be SHA-256 hashed. clientIpAddress and clientUserAgent should NOT be hashed.'
  ],
  constraints: [
    'Events must be sent within 7 days of occurring.',
    'Maximum 1000 events per API call.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Pixel/Dataset ID to send events to'),
      events: z
        .array(eventSchema)
        .min(1)
        .max(1000)
        .describe('Array of conversion events to send'),
      testEventCode: z
        .string()
        .optional()
        .describe(
          'Test event code from Events Manager for validation (events appear in Test Events tab)'
        )
    })
  )
  .output(
    z.object({
      eventsReceived: z.number().describe('Number of events received by Meta'),
      messages: z.array(z.any()).optional().describe('Any messages or warnings from Meta'),
      fbTraceId: z.string().optional().describe('Facebook trace ID for debugging')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let formattedEvents = ctx.input.events.map(event => {
      let formatted: Record<string, any> = {
        event_name: event.eventName,
        event_time: event.eventTime,
        action_source: event.actionSource,
        user_data: {
          em: event.userData.em,
          ph: event.userData.ph,
          fn: event.userData.fn,
          ln: event.userData.ln,
          ge: event.userData.ge,
          db: event.userData.db,
          ct: event.userData.ct,
          st: event.userData.st,
          zp: event.userData.zp,
          country: event.userData.country,
          external_id: event.userData.externalId,
          client_ip_address: event.userData.clientIpAddress,
          client_user_agent: event.userData.clientUserAgent,
          fbc: event.userData.fbc,
          fbp: event.userData.fbp
        }
      };

      // Clean undefined values from user_data
      for (let key of Object.keys(formatted.user_data)) {
        if (formatted.user_data[key] === undefined) {
          delete formatted.user_data[key];
        }
      }

      if (event.eventId) formatted.event_id = event.eventId;
      if (event.eventSourceUrl) formatted.event_source_url = event.eventSourceUrl;
      if (event.customData) formatted.custom_data = event.customData;

      return formatted;
    });

    let result = await client.sendConversionEvents(
      ctx.input.datasetId,
      formattedEvents,
      ctx.input.testEventCode
    );

    return {
      output: {
        eventsReceived: result.events_received || 0,
        messages: result.messages,
        fbTraceId: result.fbtrace_id
      },
      message: `Sent **${ctx.input.events.length}** conversion events to dataset \`${ctx.input.datasetId}\`. **${result.events_received || 0}** received.`
    };
  })
  .build();
