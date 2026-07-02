import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let businessWebhook = SlateTrigger.create(spec, {
  name: 'TikTok Business Events',
  key: 'business_webhook',
  description:
    'Receives webhook notifications from TikTok API for Business. Covers lead generation events, ad review status changes, and Creator Marketplace order updates. Configure webhook subscriptions in the TikTok Business API Portal.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The type of business event (e.g. lead.submitted, ad.review_status_changed, creator_marketplace.order_updated).'
        ),
      eventId: z.string().describe('Unique identifier for this event delivery.'),
      advertiserId: z.string().optional().describe('Advertiser ID associated with the event.'),
      payload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Raw event payload from TikTok Business API.')
    })
  )
  .output(
    z.object({
      advertiserId: z.string().optional().describe('Advertiser ID associated with the event.'),
      leadId: z.string().optional().describe('Lead ID for lead generation events.'),
      adId: z.string().optional().describe('Ad ID for ad review events.'),
      reviewStatus: z
        .string()
        .optional()
        .describe('New ad review status (e.g. approved, rejected).'),
      orderId: z.string().optional().describe('Creator Marketplace order ID.'),
      orderStatus: z.string().optional().describe('Updated order status.')
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
      let eventId =
        body.log_id ?? body.event_id ?? body.request_id ?? `${eventType}-${Date.now()}`;
      let advertiserId = body.advertiser_id;

      return {
        inputs: [
          {
            eventType: String(eventType),
            eventId: String(eventId),
            advertiserId: advertiserId ? String(advertiserId) : undefined,
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
          advertiserId: ctx.input.advertiserId,
          leadId: payload.lead_id ? String(payload.lead_id) : undefined,
          adId: payload.ad_id ? String(payload.ad_id) : undefined,
          reviewStatus: payload.review_status ? String(payload.review_status) : undefined,
          orderId: payload.order_id ? String(payload.order_id) : undefined,
          orderStatus: payload.order_status ? String(payload.order_status) : undefined
        }
      };
    }
  })
  .build();
