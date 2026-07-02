import { SlateTool } from 'slates';
import { z } from 'zod';
import type { ConversionEvent } from '../lib/conversions-client';
import { ConversionsClient } from '../lib/conversions-client';
import { spec } from '../spec';

let productSchema = z.object({
  productId: z.string().optional().describe('Product ID'),
  productName: z.string().optional().describe('Product name'),
  productCategory: z.string().optional().describe('Product category')
});

let eventSchema = z.object({
  clickId: z.string().optional().describe('Reddit click ID (rdt_cid) from landing page URL'),
  eventAt: z
    .string()
    .describe('Event timestamp in ISO 8601 format (must be within last 7 days)'),
  trackingType: z
    .enum([
      'Purchase',
      'AddToCart',
      'SignUp',
      'Lead',
      'ViewContent',
      'Search',
      'AddToWishlist',
      'PageVisit',
      'Custom'
    ])
    .describe('Type of conversion event'),
  customEventName: z
    .string()
    .optional()
    .describe('Custom event name (required when trackingType is Custom)'),
  email: z.string().optional().describe('User email (SHA256-hashed and lowercased)'),
  externalId: z.string().optional().describe('Advertiser-assigned user ID (SHA256-hashed)'),
  uuid: z.string().optional().describe('Reddit Pixel-generated UUID'),
  ipAddress: z.string().optional().describe('User IP address'),
  userAgent: z.string().optional().describe('User agent string'),
  idfa: z.string().optional().describe('Apple IDFA (SHA256-hashed)'),
  aaid: z.string().optional().describe('Android AAID (SHA256-hashed)'),
  screenWidth: z.number().optional().describe('Screen width in pixels'),
  screenHeight: z.number().optional().describe('Screen height in pixels'),
  conversionId: z.string().optional().describe('Unique conversion ID for deduplication'),
  itemCount: z.number().optional().describe('Number of items in the conversion'),
  currency: z.string().optional().describe('Currency code in ISO 4217 format (e.g., USD)'),
  valueDecimal: z.number().optional().describe('Monetary value of the conversion'),
  products: z.array(productSchema).optional().describe('Product details for the conversion')
});

export let sendConversionEvents = SlateTool.create(spec, {
  name: 'Send Conversion Events',
  key: 'send_conversion_events',
  description: `Send server-side conversion events to Reddit's Conversions API. Track purchases, sign-ups, leads, and custom events for attribution back to Reddit ad interactions. Requires a Conversion Access Token and Pixel ID (use the Conversion Access Token auth method).`,
  instructions: [
    'Each event must include at least one attribution signal: clickId, email, externalId, or a combination of ipAddress and userAgent.',
    'Events must have occurred within the last 7 days.',
    'Use SHA256-hashed lowercase values for email, externalId, idfa, and aaid fields.',
    'Set conversionId for deduplication if also using Reddit Pixel.'
  ],
  constraints: ['Maximum 500 events per batch request.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      pixelId: z
        .string()
        .optional()
        .describe('Reddit Pixel ID; uses the one from auth if not provided'),
      events: z.array(eventSchema).min(1).describe('Conversion events to send (max 500)')
    })
  )
  .output(
    z.object({
      eventsSent: z.number(),
      response: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let pixelId = ctx.input.pixelId || ctx.auth.pixelId;
    if (!pixelId) {
      throw new Error(
        'Pixel ID is required. Provide it in the input or use the Conversion Access Token auth method.'
      );
    }

    let client = new ConversionsClient({
      token: ctx.auth.token,
      pixelId
    });

    let events: ConversionEvent[] = ctx.input.events.map(e => {
      let event: ConversionEvent = {
        event_at: e.eventAt,
        event_type: {
          tracking_type: e.trackingType,
          custom_event_name: e.customEventName
        }
      };

      if (e.clickId) {
        event.click_id = e.clickId;
      }

      let hasUserFields =
        e.email ||
        e.externalId ||
        e.uuid ||
        e.ipAddress ||
        e.userAgent ||
        e.idfa ||
        e.aaid ||
        e.screenWidth ||
        e.screenHeight;
      if (hasUserFields) {
        event.user = {};
        if (e.email) event.user.email = e.email;
        if (e.externalId) event.user.external_id = e.externalId;
        if (e.uuid) event.user.uuid = e.uuid;
        if (e.ipAddress) event.user.ip_address = e.ipAddress;
        if (e.userAgent) event.user.user_agent = e.userAgent;
        if (e.idfa) event.user.idfa = e.idfa;
        if (e.aaid) event.user.aaid = e.aaid;
        if (e.screenWidth) event.user.screen_width = e.screenWidth;
        if (e.screenHeight) event.user.screen_height = e.screenHeight;
      }

      let hasMetadata =
        e.conversionId ||
        e.itemCount !== undefined ||
        e.currency ||
        e.valueDecimal !== undefined ||
        (e.products && e.products.length > 0);
      if (hasMetadata) {
        event.event_metadata = {};
        if (e.conversionId) event.event_metadata.conversion_id = e.conversionId;
        if (e.itemCount !== undefined) event.event_metadata.item_count = e.itemCount;
        if (e.currency) event.event_metadata.currency = e.currency;
        if (e.valueDecimal !== undefined) event.event_metadata.value_decimal = e.valueDecimal;
        if (e.products && e.products.length > 0) {
          event.event_metadata.products = e.products.map(p => ({
            id: p.productId,
            name: p.productName,
            category: p.productCategory
          }));
        }
      }

      return event;
    });

    let response = await client.sendConversionEvents(events);

    return {
      output: {
        eventsSent: events.length,
        response
      },
      message: `Successfully sent **${events.length}** conversion event(s) to Reddit Conversions API.`
    };
  })
  .build();
