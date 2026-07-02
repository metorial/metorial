import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let webhookPayloadSchema = z
  .object({
    timestamp: z.number().optional().describe('Event timestamp'),
    event: z.string().optional().describe('Event type'),
    orderStatus: z.string().optional().describe('Current order status'),
    order: z.record(z.string(), z.unknown()).optional().describe('Full order data'),
    company: z.record(z.string(), z.unknown()).optional().describe('Company data'),
    carrier: z.record(z.string(), z.unknown()).optional().describe('Carrier data'),
    deliveryDetails: z.record(z.string(), z.unknown()).optional().describe('Delivery details'),
    pickupDetails: z.record(z.string(), z.unknown()).optional().describe('Pickup details'),
    thirdPartyDeliveryOrder: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Third-party delivery data')
  })
  .passthrough();

export let orderStatusUpdate = SlateTrigger.create(spec, {
  name: 'Order Status Update',
  key: 'order_status_update',
  description:
    'Receives real-time notifications when delivery order statuses change in Shipday, including order assignment, pickup, delivery, failure, and other lifecycle events.'
})
  .input(webhookPayloadSchema)
  .output(
    z.object({
      orderId: z.number().optional().describe('Shipday order ID'),
      orderNumber: z.string().optional().describe('Order reference number'),
      event: z
        .string()
        .optional()
        .describe('Event type (e.g. ORDER_ASSIGNED, ORDER_COMPLETED)'),
      orderStatus: z
        .string()
        .optional()
        .describe('Current order status (e.g. PICKED_UP, ALREADY_DELIVERED)'),
      timestamp: z.number().optional().describe('Event timestamp'),
      totalCost: z.number().optional().describe('Total order cost'),
      deliveryFee: z.number().optional().describe('Delivery fee'),
      tips: z.number().optional().describe('Tips amount'),
      tax: z.number().optional().describe('Tax amount'),
      discount: z.number().optional().describe('Discount amount'),
      customerName: z.string().optional().describe('Customer name'),
      customerAddress: z.string().optional().describe('Customer address'),
      customerPhone: z.string().optional().describe('Customer phone'),
      pickupName: z.string().optional().describe('Pickup location name'),
      pickupAddress: z.string().optional().describe('Pickup address'),
      carrierName: z.string().optional().describe('Assigned carrier/driver name'),
      carrierPhone: z.string().optional().describe('Carrier phone'),
      carrierEmail: z.string().optional().describe('Carrier email'),
      companyName: z.string().optional().describe('Company name'),
      thirdPartyProvider: z.string().optional().describe('Third-party delivery provider name'),
      trackingUrl: z.string().optional().describe('Tracking URL'),
      proofOfDeliveryUrls: z
        .array(z.string())
        .optional()
        .describe('Proof of delivery photo URLs')
    })
  )
  .webhook({
    // Shipday webhooks are configured manually in the dashboard; no auto-registration API is available
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      return {
        inputs: [data]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input;
      let order = (payload.order ?? {}) as Record<string, unknown>;
      let company = (payload.company ?? {}) as Record<string, unknown>;
      let carrier = (payload.carrier ?? {}) as Record<string, unknown>;
      let deliveryDetails = (payload.deliveryDetails ?? {}) as Record<string, unknown>;
      let pickupDetails = (payload.pickupDetails ?? {}) as Record<string, unknown>;
      let thirdParty = (payload.thirdPartyDeliveryOrder ?? {}) as Record<string, unknown>;

      let orderId = order.id as number | undefined;
      let orderNumber = order.order_number as string | undefined;
      let event = payload.event as string | undefined;
      let orderStatus = payload.orderStatus as string | undefined;

      let eventType = event ? `order.${event.toLowerCase()}` : 'order.status_update';

      let eventId = `${orderId ?? 'unknown'}-${event ?? 'update'}-${payload.timestamp ?? Date.now()}`;

      return {
        type: eventType,
        id: eventId,
        output: {
          orderId,
          orderNumber,
          event,
          orderStatus,
          timestamp: payload.timestamp as number | undefined,
          totalCost: order.total_cost as number | undefined,
          deliveryFee: order.delivery_fee as number | undefined,
          tips: order.tips as number | undefined,
          tax: order.tax as number | undefined,
          discount: order.discounts as number | undefined,
          customerName: (deliveryDetails.name ?? deliveryDetails.customer_name) as
            | string
            | undefined,
          customerAddress: deliveryDetails.formatted_address as string | undefined,
          customerPhone: deliveryDetails.phone as string | undefined,
          pickupName: pickupDetails.name as string | undefined,
          pickupAddress: pickupDetails.formatted_address as string | undefined,
          carrierName: carrier.name as string | undefined,
          carrierPhone: carrier.phone as string | undefined,
          carrierEmail: carrier.email as string | undefined,
          companyName: company.name as string | undefined,
          thirdPartyProvider: thirdParty.thirdPartyName as string | undefined,
          trackingUrl: thirdParty.trackingUrl as string | undefined,
          proofOfDeliveryUrls: order.podUrls as string[] | undefined
        }
      };
    }
  })
  .build();
