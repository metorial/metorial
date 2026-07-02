import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { spec } from '../spec';

export let mailDeliveryEvents = SlateTrigger.create(spec, {
  name: 'Mail Delivery Events',
  key: 'mail_delivery_events',
  description:
    'Triggered when a mail piece (postcard, letter, notecard, or gift card) is delivered to a recipient.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      eventType: z.string().describe('Event type identifier'),
      orderItemId: z.number().describe('Order item ID'),
      orderId: z.number().describe('Order ID'),
      orderStatus: z.string().optional().describe('Order status'),
      currentStatus: z.string().describe('Current delivery status'),
      previousStatus: z.string().optional().describe('Previous delivery status'),
      deliveryDate: z.string().optional().nullable().describe('Delivery date'),
      recipientName: z.string().optional().nullable().describe('Recipient name'),
      recipientAddress: z.string().optional().nullable().describe('Recipient address'),
      recipientCity: z.string().optional().nullable().describe('Recipient city'),
      recipientProvince: z.string().optional().nullable().describe('Recipient state/province'),
      recipientPostalCode: z
        .string()
        .optional()
        .nullable()
        .describe('Recipient ZIP/postal code'),
      recipientEmail: z.string().optional().nullable().describe('Recipient email'),
      timestamp: z.number().describe('Unix timestamp'),
      dateTime: z.string().describe('Human-readable date/time')
    })
  )
  .output(
    z.object({
      orderItemId: z.number().describe('Order item ID'),
      orderId: z.number().describe('Order ID'),
      currentStatus: z.string().describe('Current delivery status'),
      previousStatus: z.string().optional().nullable().describe('Previous delivery status'),
      deliveryDate: z.string().optional().nullable().describe('Delivery date'),
      recipientName: z.string().optional().nullable().describe('Recipient name'),
      recipientAddress: z.string().optional().nullable().describe('Recipient street address'),
      recipientCity: z.string().optional().nullable().describe('Recipient city'),
      recipientProvince: z.string().optional().nullable().describe('Recipient state/province'),
      recipientPostalCode: z
        .string()
        .optional()
        .nullable()
        .describe('Recipient ZIP/postal code'),
      recipientEmail: z.string().optional().nullable().describe('Recipient email'),
      timestamp: z.number().describe('Unix timestamp of the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ThanksIoClient({ token: ctx.auth.token });

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        type: 'order_item.delivered',
        verb: 'post',
        description: 'Slates - Mail Delivery Events'
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
            eventId: body.event_id || `delivery_${data?.order_item?.id}_${body.timestamp}`,
            eventType: body.event_type,
            orderItemId: data?.order_item?.id,
            orderId: data?.order?.id,
            orderStatus: data?.order?.status,
            currentStatus: data?.order_item?.current_status,
            previousStatus: data?.order_item?.previous_status,
            deliveryDate: data?.order_item?.delivery_date,
            recipientName: data?.recipient?.name,
            recipientAddress: data?.recipient?.address,
            recipientCity: data?.recipient?.city,
            recipientProvince: data?.recipient?.province,
            recipientPostalCode: data?.recipient?.postal_code,
            recipientEmail: data?.recipient?.email,
            timestamp: body.timestamp,
            dateTime: body.date_time
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'order_item.delivered',
        id: ctx.input.eventId,
        output: {
          orderItemId: ctx.input.orderItemId,
          orderId: ctx.input.orderId,
          currentStatus: ctx.input.currentStatus,
          previousStatus: ctx.input.previousStatus,
          deliveryDate: ctx.input.deliveryDate,
          recipientName: ctx.input.recipientName,
          recipientAddress: ctx.input.recipientAddress,
          recipientCity: ctx.input.recipientCity,
          recipientProvince: ctx.input.recipientProvince,
          recipientPostalCode: ctx.input.recipientPostalCode,
          recipientEmail: ctx.input.recipientEmail,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
