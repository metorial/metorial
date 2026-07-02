import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { CardlyClient } from '../lib/client';
import { spec } from '../spec';

export let cardlyEvents = SlateTrigger.create(spec, {
  name: 'Cardly Events',
  key: 'cardly_events',
  description:
    'Receive near-realtime event notifications for order lifecycle, gift card redemptions, QR code scans, and delivery status changes via webhooks.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of the event (e.g. contact.order.created, giftCard.redeemed)'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      eventPayload: z
        .record(z.string(), z.unknown())
        .describe('Full event payload from Cardly')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('ID of the contact associated with the event'),
      orderId: z.string().optional().describe('ID of the related order'),
      consignmentId: z.string().optional().describe('ID of the related consignment'),
      firstName: z.string().optional().describe('Contact first name'),
      lastName: z.string().optional().describe('Contact last name'),
      email: z.string().optional().describe('Contact email address'),
      address: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Contact or consignment address'),
      giftCardCode: z.string().optional().describe('Redeemed gift card code'),
      qrCodeId: z.string().optional().describe('Scanned QR code identifier'),
      rawEvent: z.record(z.string(), z.unknown()).describe('Complete raw event data')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new CardlyClient({ token: ctx.auth.token });

      let allEvents = [
        'contact.order.created',
        'contact.order.sent',
        'contact.order.refunded',
        'giftCard.redeemed',
        'qrCode.scanned',
        'contact.undeliverable',
        'contact.changeOfAddress',
        'consignment.undeliverable',
        'consignment.changeOfAddress'
      ];

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: allEvents,
        enabled: true
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          secret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new CardlyClient({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as Record<string, unknown>;

      let eventType = (body.event || body.type || 'unknown') as string;
      let eventId = (body.id || body.eventId || `${eventType}-${Date.now()}`) as string;

      return {
        inputs: [
          {
            eventType,
            eventId,
            eventPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.eventPayload;
      let data = (payload.data || payload) as Record<string, unknown>;

      let contact = data.contact as Record<string, unknown> | undefined;
      let order = data.order as Record<string, unknown> | undefined;
      let consignment = data.consignment as Record<string, unknown> | undefined;
      let giftCard = data.giftCard as Record<string, unknown> | undefined;
      let qrCode = data.qrCode as Record<string, unknown> | undefined;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          contactId: (contact?.id || data.contactId) as string | undefined,
          orderId: (order?.id || data.orderId) as string | undefined,
          consignmentId: (consignment?.id || data.consignmentId) as string | undefined,
          firstName: contact?.firstName as string | undefined,
          lastName: contact?.lastName as string | undefined,
          email: contact?.email as string | undefined,
          address: (contact?.address || consignment?.address) as
            | Record<string, unknown>
            | undefined,
          giftCardCode: giftCard?.code as string | undefined,
          qrCodeId: (qrCode?.id || data.qrCodeId) as string | undefined,
          rawEvent: payload
        }
      };
    }
  })
  .build();
