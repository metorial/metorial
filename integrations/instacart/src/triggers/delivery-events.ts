import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let deliveryEventInputSchema = z.object({
  eventType: z.string().describe('The delivery/tracking event type'),
  orderId: z.string().describe('The order ID this event relates to'),
  userId: z.string().optional().describe('The Connect user ID'),
  latitude: z.number().optional().describe('Shopper GPS latitude'),
  longitude: z.number().optional().describe('Shopper GPS longitude'),
  eta: z.string().optional().describe('Estimated time of arrival'),
  timestamp: z.string().optional().describe('When the event occurred'),
  rawPayload: z.any().describe('Full raw event payload')
});

export let deliveryEvents = SlateTrigger.create(spec, {
  name: 'Delivery & Tracking Events',
  key: 'delivery_events',
  description:
    'Receives webhook notifications for delivery tracking events including order_location (GPS updates), late_delivery, late_pickup, customer_missing, at_store_eta, and last mile events (at_store, acknowledged_for_delivery, bags_verified, arrival_at_customer). Configure the webhook URL in the Instacart Developer Dashboard.'
})
  .input(deliveryEventInputSchema)
  .output(
    z.object({
      orderId: z.string().describe('The order ID'),
      userId: z.string().optional().describe('The Connect user ID'),
      latitude: z.number().optional().describe('Shopper GPS latitude'),
      longitude: z.number().optional().describe('Shopper GPS longitude'),
      eta: z.string().optional().describe('Estimated time of arrival'),
      timestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = (data.event || data.event_type || data.type || 'unknown') as string;
      let orderId = (data.order_id || '') as string;
      let userId = data.user_id as string | undefined;
      let latitude = data.latitude as number | undefined;
      let longitude = data.longitude as number | undefined;
      let eta = data.eta as string | undefined;
      let timestamp = (data.timestamp || data.created_at) as string | undefined;

      let events = data.events as Record<string, unknown>[] | undefined;
      if (events && Array.isArray(events)) {
        return {
          inputs: events.map(evt => ({
            eventType: (evt.event || evt.event_type || evt.type || 'unknown') as string,
            orderId: (evt.order_id || '') as string,
            userId: evt.user_id as string | undefined,
            latitude: evt.latitude as number | undefined,
            longitude: evt.longitude as number | undefined,
            eta: evt.eta as string | undefined,
            timestamp: (evt.timestamp || evt.created_at) as string | undefined,
            rawPayload: evt
          }))
        };
      }

      return {
        inputs: [
          {
            eventType,
            orderId,
            userId,
            latitude,
            longitude,
            eta,
            timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventTypeNormalized = ctx.input.eventType.toLowerCase().replace(/[^a-z0-9_]/g, '_');

      return {
        type: `delivery.${eventTypeNormalized}`,
        id: `${ctx.input.orderId}_${eventTypeNormalized}_${ctx.input.timestamp || Date.now()}`,
        output: {
          orderId: ctx.input.orderId,
          userId: ctx.input.userId,
          latitude: ctx.input.latitude,
          longitude: ctx.input.longitude,
          eta: ctx.input.eta,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
