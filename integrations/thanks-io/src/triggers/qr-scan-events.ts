import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { spec } from '../spec';

export let qrScanEvents = SlateTrigger.create(spec, {
  name: 'QR Code Scan Events',
  key: 'qr_scan_events',
  description:
    'Triggered when a QR code on a mailer (postcard, letter, notecard) is scanned by a recipient, or when a gift card is redeemed.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      eventType: z.string().describe('Event type identifier'),
      orderItemId: z.number().describe('Order item ID'),
      orderId: z.number().describe('Order ID'),
      scanCount: z.number().optional().describe('Total scan count for this item'),
      qrcodeUrl: z.string().optional().nullable().describe('QR code URL that was scanned'),
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
      scanCount: z.number().optional().describe('Total scans for this item'),
      qrcodeUrl: z.string().optional().nullable().describe('QR code URL that was scanned'),
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
        type: 'scans.scan_update',
        verb: 'post',
        description: 'Slates - QR Code Scan Events'
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
            eventId: body.event_id || `scan_${data?.order_item?.id}_${body.timestamp}`,
            eventType: body.event_type,
            orderItemId: data?.order_item?.id,
            orderId: data?.order?.id,
            scanCount: data?.order_item?.scans,
            qrcodeUrl: data?.qrcode_url,
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
        type: 'scans.scan_update',
        id: ctx.input.eventId,
        output: {
          orderItemId: ctx.input.orderItemId,
          orderId: ctx.input.orderId,
          scanCount: ctx.input.scanCount,
          qrcodeUrl: ctx.input.qrcodeUrl,
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
