import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let bookingEvents = SlateTrigger.create(spec, {
  name: 'Booking Events',
  key: 'booking_events',
  description:
    'Triggers on booking events including booking created/updated/canceled, service created/updated/deleted, and schedule changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of booking event'),
      eventId: z.string().describe('Unique event identifier'),
      resourceId: z.string().describe('ID of the affected booking or service'),
      payload: z.any().describe('Full event payload')
    })
  )
  .output(
    z.object({
      bookingId: z.string().optional().describe('Booking ID'),
      serviceId: z.string().optional().describe('Service ID'),
      serviceName: z.string().optional().describe('Service name'),
      status: z.string().optional().describe('Booking status'),
      startDate: z.string().optional().describe('Booking start date/time'),
      endDate: z.string().optional().describe('Booking end date/time'),
      contactId: z.string().optional().describe('Contact ID of the person who booked'),
      numberOfParticipants: z.number().optional().describe('Number of participants'),
      rawPayload: z.any().optional().describe('Complete raw event data')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let eventType = data.eventType || data.type || 'unknown';
      let eventId = data.eventId || `${data.instanceId}-${Date.now()}`;
      let payload = data.data || data;

      let resourceId =
        payload.booking?.id ||
        payload.service?.id ||
        payload.bookingId ||
        payload.serviceId ||
        eventId;

      return {
        inputs: [
          {
            eventType,
            eventId,
            resourceId,
            payload
          }
        ]
      };
    },
    handleEvent: async ctx => {
      let payload = ctx.input.payload;
      let booking = payload.booking || payload;
      let service = payload.service;

      let type = ctx.input.eventType.toLowerCase().replace(/\//g, '.').replace(/\s+/g, '_');
      if (!type.includes('.')) {
        type = `booking.${type}`;
      }

      return {
        type,
        id: ctx.input.eventId,
        output: {
          bookingId: booking?.id || payload.bookingId,
          serviceId: service?.id || booking?.bookedEntity?.serviceId || payload.serviceId,
          serviceName: service?.name || booking?.bookedEntity?.title,
          status: booking?.status,
          startDate: booking?.bookedEntity?.slot?.startDate || booking?.startDate,
          endDate: booking?.bookedEntity?.slot?.endDate || booking?.endDate,
          contactId: booking?.contactId || booking?.bookedBy?.contactId,
          numberOfParticipants: booking?.numberOfParticipants || booking?.totalParticipants,
          rawPayload: payload
        }
      };
    }
  })
  .build();
