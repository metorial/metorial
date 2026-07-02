import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let bookingUpdates = SlateTrigger.create(spec, {
  name: 'Booking Updates',
  key: 'booking_updates',
  description:
    'Receive webhook notifications when booking/job statuses change, including scheduled, in progress, completed, cancelled, and failed events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of booking event'),
      eventId: z.string().describe('Unique ID of the webhook event'),
      bookingId: z.string().describe('ID of the affected booking/job'),
      bookingAttributes: z.any().describe('Current attributes of the booking'),
      previousAttributes: z
        .any()
        .nullable()
        .describe('Previous attributes of the booking before the change')
    })
  )
  .output(
    z.object({
      bookingId: z.string().describe('ID of the booking/job'),
      addressId: z.string().describe('ID of the address where the job is performed'),
      status: z.string().describe('Current status of the booking'),
      serviceTypeKey: z.string().nullable().describe('Service type key'),
      price: z.number().nullable().describe('Price of the booking'),
      currentStartDatetime: z.string().nullable().describe('Currently scheduled start time'),
      startNoEarlierThan: z.string().nullable().describe('Earliest allowed start time'),
      endNoLaterThan: z.string().nullable().describe('Latest allowed end time'),
      toDoListId: z.string().nullable().describe('ID of the associated to-do list'),
      cancelledBy: z.string().nullable().describe('Who cancelled the booking, if applicable'),
      isPartiallyCompleted: z
        .boolean()
        .nullable()
        .describe('Whether the booking was only partially completed'),
      url: z.string().nullable().describe('URL link to the booking details'),
      createdAt: z.string().nullable().describe('Timestamp when the booking was created')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.type ?? data.event_type ?? 'unknown';
      let eventId = data.uuid ?? data.id ?? `${eventType}-${Date.now()}`;
      let booking = data.data?.attributes ?? data.attributes ?? data.booking ?? data;
      let previous = data.data?.previous_attributes ?? data.previous_attributes ?? null;
      let bookingId = booking?.id ?? data.booking_id ?? eventId;

      return {
        inputs: [
          {
            eventType,
            eventId,
            bookingId: String(bookingId),
            bookingAttributes: booking,
            previousAttributes: previous
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let attrs = ctx.input.bookingAttributes ?? {};

      let typeMap: Record<string, string> = {
        'booking.scheduled': 'booking.scheduled',
        'booking.in_progress': 'booking.in_progress',
        'booking.completed': 'booking.completed',
        'booking.cancelled': 'booking.cancelled',
        'booking.failed': 'booking.failed'
      };

      let eventType =
        typeMap[ctx.input.eventType] ??
        `booking.${ctx.input.eventType.replace(/^booking\.?/, '')}`;

      return {
        type: eventType,
        id: ctx.input.eventId,
        output: {
          bookingId: ctx.input.bookingId,
          addressId: attrs.address_id ?? '',
          status: attrs.status ?? ctx.input.eventType.replace('booking.', ''),
          serviceTypeKey: attrs.service_type_key ?? null,
          price: attrs.price ?? null,
          currentStartDatetime: attrs.current_start_datetime ?? null,
          startNoEarlierThan: attrs.start_no_earlier_than ?? null,
          endNoLaterThan: attrs.end_no_later_than ?? null,
          toDoListId: attrs.to_do_list_id ?? null,
          cancelledBy: attrs.cancelled_by ?? null,
          isPartiallyCompleted: attrs.is_partially_completed ?? null,
          url: attrs.url ?? null,
          createdAt: attrs.created_at ?? null
        }
      };
    }
  })
  .build();
