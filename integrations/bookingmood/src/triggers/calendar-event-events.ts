import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let calendarEventEvents = SlateTrigger.create(spec, {
  name: 'Calendar Event Events',
  key: 'calendar_event_events',
  description: 'Triggers when a calendar event is created, updated, confirmed, or cancelled.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      eventType: z
        .string()
        .describe('Event type: calendar_events.created, updated, confirmed, or cancelled'),
      calendarEventNew: z.any().describe('New calendar event data'),
      calendarEventOld: z.any().nullable().describe('Previous calendar event data')
    })
  )
  .output(
    z.object({
      calendarEventId: z.string().describe('UUID of the calendar event'),
      bookingId: z.string().nullable().describe('UUID of the related booking'),
      productId: z.string().describe('UUID of the product'),
      title: z.string().nullable().describe('Event title'),
      type: z.string().describe('Event type: booking, blocked period, or note'),
      status: z.string().describe('Event status: CONFIRMED, TENTATIVE, or CANCELLED'),
      startDate: z.string().describe('Start date'),
      endDate: z.string().describe('End date'),
      duration: z.number().nullable().describe('Duration in days'),
      notes: z.string().nullable().describe('Private annotations'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BookingmoodClient(ctx.auth.token);
      let webhook = await client.createWebhook({
        endpoint: ctx.input.webhookBaseUrl,
        events: [
          'calendar_events.created',
          'calendar_events.updated',
          'calendar_events.confirmed',
          'calendar_events.cancelled'
        ],
        description: 'Slates: Calendar Event Events'
      });
      return { registrationDetails: { webhookId: webhook.id } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BookingmoodClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      return {
        inputs: [
          {
            eventId: data.id,
            eventType: data.event_type,
            calendarEventNew: data.payload?.new ?? null,
            calendarEventOld: data.payload?.old ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let ce = ctx.input.calendarEventNew;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          calendarEventId: ce.id,
          bookingId: ce.booking_id ?? null,
          productId: ce.product_id,
          title: ce.title ?? null,
          type: ce.type,
          status: ce.status,
          startDate: ce.start_date,
          endDate: ce.end_date,
          duration: ce.duration ?? null,
          notes: ce.notes ?? null,
          createdAt: ce.created_at,
          updatedAt: ce.updated_at
        }
      };
    }
  })
  .build();
