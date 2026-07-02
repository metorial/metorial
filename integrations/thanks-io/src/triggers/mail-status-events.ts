import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { spec } from '../spec';

export let mailStatusEvents = SlateTrigger.create(spec, {
  name: 'Mail Piece Status Events',
  key: 'mail_status_events',
  description:
    'Triggered when an individual mail piece (order item) changes status. Statuses include Processing, Printed, Shipped, In Transit, In Local Area, Processed for Delivery, Re-routed, Returned to Sender, Delivered, and Failed.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      eventType: z.string().describe('Event type identifier'),
      orderItemId: z.number().describe('Order item ID'),
      orderId: z.number().describe('Order ID'),
      orderStatus: z.string().optional().describe('Order status'),
      currentStatus: z.string().describe('Current item status'),
      previousStatus: z.string().optional().describe('Previous item status'),
      deliveryDate: z.string().optional().nullable().describe('Delivery date'),
      recipientName: z.string().optional().nullable().describe('Recipient name'),
      recipientCompany: z.string().optional().nullable().describe('Recipient company'),
      recipientAddress: z.string().optional().nullable().describe('Recipient address'),
      recipientCity: z.string().optional().nullable().describe('Recipient city'),
      recipientProvince: z.string().optional().nullable().describe('Recipient state/province'),
      recipientPostalCode: z
        .string()
        .optional()
        .nullable()
        .describe('Recipient ZIP/postal code'),
      recipientEmail: z.string().optional().nullable().describe('Recipient email'),
      recipientPhone: z.string().optional().nullable().describe('Recipient phone'),
      timestamp: z.number().describe('Unix timestamp'),
      dateTime: z.string().describe('Human-readable date/time')
    })
  )
  .output(
    z.object({
      orderItemId: z.number().describe('Order item ID'),
      orderId: z.number().describe('Order ID'),
      currentStatus: z.string().describe('Current item status'),
      previousStatus: z.string().optional().nullable().describe('Previous item status'),
      deliveryDate: z.string().optional().nullable().describe('Delivery/expected date'),
      recipientName: z.string().optional().nullable().describe('Recipient name'),
      recipientCompany: z.string().optional().nullable().describe('Recipient company'),
      recipientAddress: z.string().optional().nullable().describe('Recipient address'),
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
        type: 'order_item.status_update',
        verb: 'post',
        description: 'Slates - Mail Piece Status Events'
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
            eventId: body.event_id || `item_status_${data?.order_item?.id}_${body.timestamp}`,
            eventType: body.event_type,
            orderItemId: data?.order_item?.id,
            orderId: data?.order?.id,
            orderStatus: data?.order?.status,
            currentStatus: data?.order_item?.current_status,
            previousStatus: data?.order_item?.previous_status,
            deliveryDate: data?.order_item?.delivery_date,
            recipientName: data?.recipient?.name,
            recipientCompany: data?.recipient?.company,
            recipientAddress: data?.recipient?.address,
            recipientCity: data?.recipient?.city,
            recipientProvince: data?.recipient?.province,
            recipientPostalCode: data?.recipient?.postal_code,
            recipientEmail: data?.recipient?.email,
            recipientPhone: data?.recipient?.phone,
            timestamp: body.timestamp,
            dateTime: body.date_time
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'order_item.status_update',
        id: ctx.input.eventId,
        output: {
          orderItemId: ctx.input.orderItemId,
          orderId: ctx.input.orderId,
          currentStatus: ctx.input.currentStatus,
          previousStatus: ctx.input.previousStatus,
          deliveryDate: ctx.input.deliveryDate,
          recipientName: ctx.input.recipientName,
          recipientCompany: ctx.input.recipientCompany,
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
