import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let orderEventInputSchema = z.object({
  eventType: z.string().describe('The order event type'),
  orderId: z.string().describe('The order ID this event relates to'),
  userId: z.string().optional().describe('The Connect user ID'),
  status: z.string().optional().describe('The new order status'),
  cancellationReason: z.string().optional().describe('Reason for cancellation, if applicable'),
  cancellationType: z.string().optional().describe('Type of cancellation'),
  timestamp: z.string().optional().describe('When the event occurred'),
  rawPayload: z.any().describe('Full raw event payload from Instacart')
});

export let orderEvents = SlateTrigger.create(spec, {
  name: 'Order Events',
  key: 'order_events',
  description:
    'Receives webhook notifications for order lifecycle events including status changes (brand_new, acknowledged, picking, checkout, staged, delivering, delivered, rescheduled, canceled). Configure the webhook URL in the Instacart Developer Dashboard.'
})
  .input(orderEventInputSchema)
  .output(
    z.object({
      orderId: z.string().describe('The order ID'),
      userId: z.string().optional().describe('The Connect user ID'),
      status: z.string().optional().describe('The new order status'),
      cancellationReason: z.string().optional().describe('Reason for cancellation'),
      cancellationType: z.string().optional().describe('Type of cancellation'),
      timestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = (data.event || data.event_type || data.type || 'unknown') as string;
      let orderId = (data.order_id || '') as string;
      let userId = data.user_id as string | undefined;
      let status = (data.status || data.workflow_state) as string | undefined;
      let cancellationReason = data.cancellation_reason as string | undefined;
      let cancellationType = data.cancellation_type as string | undefined;
      let timestamp = (data.timestamp || data.created_at) as string | undefined;

      // Handle array of events if the provider batches them
      let events = data.events as Record<string, unknown>[] | undefined;
      if (events && Array.isArray(events)) {
        return {
          inputs: events.map(evt => ({
            eventType: (evt.event || evt.event_type || evt.type || 'unknown') as string,
            orderId: (evt.order_id || '') as string,
            userId: evt.user_id as string | undefined,
            status: (evt.status || evt.workflow_state) as string | undefined,
            cancellationReason: evt.cancellation_reason as string | undefined,
            cancellationType: evt.cancellation_type as string | undefined,
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
            status,
            cancellationReason,
            cancellationType,
            timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventTypeNormalized = ctx.input.eventType.toLowerCase().replace(/[^a-z0-9_]/g, '_');

      return {
        type: `order.${eventTypeNormalized}`,
        id: `${ctx.input.orderId}_${eventTypeNormalized}_${ctx.input.timestamp || Date.now()}`,
        output: {
          orderId: ctx.input.orderId,
          userId: ctx.input.userId,
          status: ctx.input.status,
          cancellationReason: ctx.input.cancellationReason,
          cancellationType: ctx.input.cancellationType,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
