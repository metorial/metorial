import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { snapchatServiceError } from '../lib/errors';
import { spec } from '../spec';

let userDataSchema = z
  .object({
    hashedEmail: z.string().optional().describe('SHA-256 hashed email address'),
    hashedPhone: z.string().optional().describe('SHA-256 hashed phone number'),
    clientIpAddress: z.string().optional().describe('Client IP address. Do not hash.'),
    hashedIpAddress: z
      .string()
      .optional()
      .describe(
        'Deprecated alias for clientIpAddress. Snapchat expects unhashed IP addresses.'
      ),
    userAgent: z.string().optional().describe('User agent string'),
    mobileAdId: z.string().optional().describe('Mobile advertising ID. Do not hash.'),
    hashedMobileAdId: z
      .string()
      .optional()
      .describe('Deprecated alias for mobileAdId. Snapchat expects unhashed mobile ad IDs.'),
    clickId: z.string().optional().describe('Snap click ID from URL parameter'),
    cookie1: z.string().optional().describe('Snap cookie 1 (_scid)'),
    externalId: z.string().optional().describe('Advertiser external user ID')
  })
  .describe('User matching parameters for attribution');

let customDataSchema = z
  .object({
    currency: z.string().optional().describe('Currency code (e.g., USD)'),
    value: z.number().optional().describe('Numeric value of the conversion'),
    price: z
      .number()
      .optional()
      .describe('Deprecated alias for value. Sent as Snapchat custom_data.value.'),
    transactionId: z.string().optional().describe('Unique transaction identifier'),
    itemCategory: z.string().optional().describe('Item category'),
    itemIds: z.array(z.string()).optional().describe('List of item IDs'),
    numberOfItems: z.number().optional().describe('Number of items'),
    searchString: z.string().optional().describe('Search query string'),
    contents: z
      .array(
        z.object({
          id: z.string().describe('Catalog item or product ID'),
          quantity: z.number().optional().describe('Quantity of this item'),
          itemPrice: z.number().optional().describe('Item price'),
          brand: z.string().optional().describe('Item brand')
        })
      )
      .optional()
      .describe('Product contents for Dynamic Ads attribution')
  })
  .describe('Custom event data for richer attribution');

let normalizeEventTime = (value: string | number) => {
  if (typeof value === 'number') return value;

  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  let parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw snapchatServiceError(
      'eventTime must be an ISO 8601 timestamp or Unix epoch number.'
    );
  }

  return parsed;
};

let hasUserMatchParameter = (userData: z.infer<typeof userDataSchema>) => {
  let hasIpAndAgent = Boolean(
    (userData.clientIpAddress || userData.hashedIpAddress) && userData.userAgent
  );

  return Boolean(
    userData.hashedEmail ||
      userData.hashedPhone ||
      hasIpAndAgent ||
      userData.mobileAdId ||
      userData.hashedMobileAdId ||
      userData.clickId ||
      userData.cookie1 ||
      userData.externalId
  );
};

export let sendConversionEvent = SlateTool.create(spec, {
  name: 'Send Conversion Event',
  key: 'send_conversion_event',
  description: `Send web, app, or offline conversion events to Snapchat via the Conversions API (CAPI). Supports standard event types like purchases, add-to-cart, page views, sign-ups, and custom events. Events are used for ad attribution and optimization.`,
  instructions: [
    'At least one user matching parameter is required for attribution (email, phone, IP, click ID, etc.).',
    'Email and phone identifiers must be SHA-256 hashed.',
    'Use clientDedupId to deduplicate with Snap Pixel events (48-hour window).',
    'Events can be sent up to 37 days after they occur.'
  ]
})
  .input(
    z.object({
      pixelOrAppId: z
        .string()
        .describe('Snap Pixel ID (for web/offline events) or Snap App ID (for mobile events)'),
      validateOnly: z
        .boolean()
        .optional()
        .describe('Validate event payloads without sending them to production attribution'),
      events: z
        .array(
          z.object({
            eventName: z
              .string()
              .describe(
                'Event type (PURCHASE, ADD_CART, PAGE_VIEW, SIGN_UP, VIEW_CONTENT, ADD_BILLING, SEARCH, START_CHECKOUT, ADD_TO_WISHLIST, SUBSCRIBE, AD_CLICK, AD_VIEW, COMPLETE_TUTORIAL, LEVEL_COMPLETE, SPENT_CREDITS, LIST_VIEW, CUSTOM_EVENT_1 through CUSTOM_EVENT_5)'
              ),
            eventTime: z
              .union([z.number(), z.string()])
              .describe(
                'Event timestamp as Unix epoch seconds/milliseconds or ISO 8601 string'
              ),
            eventSourceUrl: z.string().optional().describe('URL where the event occurred'),
            actionSource: z
              .enum(['WEB', 'MOBILE_APP', 'OFFLINE'])
              .describe('Source of the event'),
            userData: userDataSchema,
            customData: customDataSchema.optional(),
            clientDedupId: z
              .string()
              .optional()
              .describe('Deduplication ID to prevent duplicate counting with Snap Pixel')
          })
        )
        .describe('Array of conversion events to send')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from Snapchat'),
      reason: z.string().optional().describe('Snapchat response reason, if returned'),
      response: z.any().optional().describe('Full response from the Conversions API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);

    let formattedEvents = ctx.input.events.map(event => {
      if (!event.eventSourceUrl) {
        throw snapchatServiceError('eventSourceUrl is required for conversion events.');
      }
      if (!hasUserMatchParameter(event.userData)) {
        throw snapchatServiceError(
          'At least one user matching parameter is required for each conversion event.'
        );
      }
      if (
        event.eventName.toUpperCase() === 'PURCHASE' &&
        (!event.customData?.currency ||
          (event.customData.value === undefined && event.customData.price === undefined))
      ) {
        throw snapchatServiceError(
          'PURCHASE events require customData.currency and customData.value.'
        );
      }

      let formatted: Record<string, any> = {
        event_name: event.eventName,
        event_time: normalizeEventTime(event.eventTime),
        action_source: event.actionSource
      };
      if (event.eventSourceUrl) formatted.event_source_url = event.eventSourceUrl;
      if (event.clientDedupId) formatted.event_id = event.clientDedupId;

      let userData: Record<string, any> = {};
      if (event.userData.hashedEmail) userData.em = [event.userData.hashedEmail];
      if (event.userData.hashedPhone) userData.ph = [event.userData.hashedPhone];
      if (event.userData.clientIpAddress || event.userData.hashedIpAddress) {
        userData.client_ip_address =
          event.userData.clientIpAddress ?? event.userData.hashedIpAddress;
      }
      if (event.userData.userAgent) userData.client_user_agent = event.userData.userAgent;
      if (event.userData.mobileAdId || event.userData.hashedMobileAdId) {
        userData.madid = event.userData.mobileAdId ?? event.userData.hashedMobileAdId;
      }
      if (event.userData.clickId) userData.sc_click_id = event.userData.clickId;
      if (event.userData.cookie1) userData.sc_cookie1 = event.userData.cookie1;
      if (event.userData.externalId) userData.external_id = event.userData.externalId;
      formatted.user_data = userData;

      if (event.customData) {
        let customData: Record<string, any> = {};
        if (event.customData.currency) customData.currency = event.customData.currency;
        if (event.customData.value !== undefined || event.customData.price !== undefined) {
          customData.value = event.customData.value ?? event.customData.price;
        }
        if (event.customData.transactionId)
          customData.order_id = event.customData.transactionId;
        if (event.customData.itemCategory)
          customData.content_category = event.customData.itemCategory;
        if (event.customData.itemIds) customData.content_ids = event.customData.itemIds;
        if (event.customData.numberOfItems !== undefined)
          customData.num_items = event.customData.numberOfItems;
        if (event.customData.searchString)
          customData.search_string = event.customData.searchString;
        if (event.customData.contents) {
          customData.contents = event.customData.contents.map(item => ({
            id: item.id,
            quantity: item.quantity,
            item_price: item.itemPrice,
            brand: item.brand
          }));
        }
        formatted.custom_data = customData;
      }

      return formatted;
    });

    let result = ctx.input.validateOnly
      ? await client.validateConversionEvents(ctx.input.pixelOrAppId, formattedEvents)
      : await client.sendConversionEvents(ctx.input.pixelOrAppId, formattedEvents);

    return {
      output: {
        status: result.status || result.request_status || 'SUCCESS',
        reason: result.reason,
        response: result
      },
      message: `${ctx.input.validateOnly ? 'Validated' : 'Sent'} **${ctx.input.events.length}** conversion event(s) with Snapchat.`
    };
  })
  .build();
