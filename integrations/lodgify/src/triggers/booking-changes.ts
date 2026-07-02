import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let bookingChanges = SlateTrigger.create(spec, {
  name: 'Booking Changes',
  key: 'booking_changes',
  description:
    'Triggers when a booking is created, updated, or its status changes (booked, open, declined, tentative).'
})
  .input(
    z.object({
      action: z.string().describe('The webhook action type'),
      booking: z.record(z.string(), z.any()).describe('Booking data from the webhook payload'),
      guest: z
        .record(z.string(), z.any())
        .optional()
        .describe('Guest data from the webhook payload'),
      currentOrder: z
        .record(z.string(), z.any())
        .optional()
        .describe('Current order/quote data')
    })
  )
  .output(
    z.object({
      bookingId: z.number().describe('ID of the affected booking'),
      propertyId: z.number().optional().describe('ID of the property'),
      propertyName: z.string().optional().describe('Name of the property'),
      status: z.string().optional().describe('Current booking status'),
      arrival: z.string().optional().describe('Arrival/check-in date'),
      departure: z.string().optional().describe('Departure/check-out date'),
      nights: z.number().optional().describe('Number of nights'),
      guestName: z.string().optional().describe('Guest full name'),
      guestEmail: z.string().optional().describe('Guest email address'),
      guestPhone: z.string().optional().describe('Guest phone number'),
      guestCountry: z.string().optional().describe('Guest country'),
      source: z.string().optional().describe('Booking source (e.g., Airbnb, Manual)'),
      currencyCode: z.string().optional().describe('Currency code (e.g., USD)'),
      notes: z.string().optional().describe('Booking notes'),
      roomTypes: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Room types included in the booking'),
      createdAt: z.string().optional().describe('When the booking was created')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let events = ['booking_new', 'booking_change'];

      let registrations: Array<{ event: string; webhookId: string; secret: string }> = [];

      for (let event of events) {
        let result = await client.subscribeWebhook(
          event,
          `${ctx.input.webhookBaseUrl}/${event}`
        );
        registrations.push({
          event,
          webhookId: String(result.id ?? result.webhook_id ?? result),
          secret: result.secret ?? result.signing_secret ?? ''
        });
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        registrations: Array<{ webhookId: string }>;
      };

      for (let reg of details.registrations) {
        try {
          await client.unsubscribeWebhook(reg.webhookId);
        } catch (_e) {
          // Best-effort unregistration
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let action = (data.action as string) ?? 'booking_change';
      let booking = (data.booking as Record<string, unknown>) ?? {};
      let guest = data.guest as Record<string, unknown> | undefined;
      let currentOrder = (data.current_order ?? data.currentOrder) as
        | Record<string, unknown>
        | undefined;

      return {
        inputs: [
          {
            action,
            booking,
            guest,
            currentOrder
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { action, booking, guest } = ctx.input;

      let eventType = action.includes('new') ? 'booking.created' : 'booking.updated';

      let bookingId = Number(booking.id ?? booking.booking_id ?? 0);

      return {
        type: eventType,
        id: `${action}-${bookingId}-${Date.now()}`,
        output: {
          bookingId,
          propertyId: booking.property_id as number | undefined,
          propertyName: booking.property_name as string | undefined,
          status: booking.status as string | undefined,
          arrival: booking.date_arrival as string | undefined,
          departure: booking.date_departure as string | undefined,
          nights: booking.nights as number | undefined,
          guestName: guest?.name as string | undefined,
          guestEmail: guest?.email as string | undefined,
          guestPhone: guest?.phone_number as string | undefined,
          guestCountry: guest?.country as string | undefined,
          source: booking.source as string | undefined,
          currencyCode: booking.currency_code as string | undefined,
          notes: booking.notes as string | undefined,
          roomTypes: booking.room_types as Record<string, unknown>[] | undefined,
          createdAt: booking.date_created as string | undefined
        }
      };
    }
  })
  .build();
