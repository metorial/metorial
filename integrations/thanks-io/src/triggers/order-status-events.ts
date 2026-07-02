import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { spec } from '../spec';

export let orderStatusEvents = SlateTrigger.create(spec, {
  name: 'Order Status Events',
  key: 'order_status_events',
  description:
    'Triggered when an order status changes (e.g., Reviewing, Printing, Printed, Fulfilled, Shipped, Delivered, Cancelled, Error).'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      eventType: z.string().describe('Event type identifier'),
      orderId: z.number().describe('Order ID'),
      orderStatus: z.string().describe('Current order status'),
      timestamp: z.number().describe('Unix timestamp of the event'),
      dateTime: z.string().describe('Human-readable date/time')
    })
  )
  .output(
    z.object({
      orderId: z.number().describe('Order ID'),
      orderStatus: z.string().describe('Current order status'),
      timestamp: z.number().describe('Unix timestamp of the event'),
      dateTime: z.string().describe('Human-readable date/time')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ThanksIoClient({ token: ctx.auth.token });

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        type: 'order.status_update',
        verb: 'post',
        description: 'Slates - Order Status Events'
      });

      return {
        registrationDetails: {
          webhookId: result.id as number
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ThanksIoClient({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId as number);
    },

    handleRequest: async ctx => {
      let body: any = await ctx.request.json();

      if (!body?.event_type || !body.data) {
        return { inputs: [] };
      }

      let data = body.data;
      return {
        inputs: [
          {
            eventId: body.event_id || `order_status_${data?.order?.id}_${body.timestamp}`,
            eventType: body.event_type,
            orderId: data?.order?.id,
            orderStatus: data?.order?.status,
            timestamp: body.timestamp,
            dateTime: body.date_time
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'order.status_update',
        id: ctx.input.eventId,
        output: {
          orderId: ctx.input.orderId,
          orderStatus: ctx.input.orderStatus,
          timestamp: ctx.input.timestamp,
          dateTime: ctx.input.dateTime
        }
      };
    }
  })
  .build();
