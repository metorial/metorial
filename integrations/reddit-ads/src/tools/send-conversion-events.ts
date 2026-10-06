import { SlateTool } from 'slates';
import { z } from 'zod';
import { id, invalid } from '../lib/contracts';
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
    .describe(
      'Custom event name (required when trackingType is Custom; up to 64 Unicode characters)'
    ),
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
  description:
    'Submit irreversible conversion events using deliberately selected CAPI v2 or v3. Preserves prehashed match keys and base-currency value. An HTTP acknowledgment is distinct from attribution or deduplication completion.',
  instructions: [
    'Each event must include at least one attribution signal: clickId, email, externalId, or a combination of ipAddress and userAgent.',
    'Events must have occurred within the last 7 days.',
    'Use SHA256-hashed lowercase values for email, externalId, idfa, and aaid fields.',
    'Set conversionId for deduplication if also using Reddit Pixel.'
  ],
  constraints: ['Maximum 500 events for legacy v2 or 1000 events for v3.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      apiVersion: z
        .enum(['v2', 'v3'])
        .optional()
        .describe(
          'Explicit CAPI version override. Existing unmarked connections default to v2; new conversion connections default to v3.'
        ),
      actionSource: z
        .enum(['WEBSITE', 'APP', 'OTHER', 'PHYSICAL_STORE'])
        .optional()
        .describe('Required for v3 events; classifies where the event happened.'),
      testId: z
        .string()
        .optional()
        .describe('v3 Events Testing identifier; does not erase retained ingestion history.'),
      pixelId: z
        .string()
        .optional()
        .describe('Reddit Pixel ID; uses the one from auth if not provided'),
      events: z
        .array(eventSchema)
        .min(1)
        .describe('Conversion events to submit; 500 for v2 or 1000 for v3')
    })
  )
  .output(
    z.object({
      apiVersion: z.enum(['v2', 'v3']),
      acknowledged: z.boolean(),
      attributionVerified: z.boolean(),
      eventsSent: z.number(),
      response: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    const pixelId = ctx.input.pixelId ?? ctx.auth.pixelId;
    if (pixelId === undefined)
      invalid(
        'Provide pixelId or connect with a Conversion Access Token and its authorized Pixel.'
      );
    const result = await new ConversionsClient(
      ctx.auth,
      id(pixelId, 'Pixel ID'),
      ctx.input.apiVersion
    ).send(ctx.input);
    return {
      output: result,
      message:
        'Reddit acknowledged conversion-event submission. Submitted count is not proof of attribution or deduplication completion; do not automatically resend.'
    };
  })
  .build();
