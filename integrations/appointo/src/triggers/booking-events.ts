import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let bookingEventInputSchema = z.object({
  eventType: z.enum(['created', 'rescheduled', 'canceled']).describe('Type of booking event'),
  bookingId: z.number().describe('Booking ID'),
  customerName: z.string().optional().describe('Customer name'),
  customerEmail: z.string().optional().describe('Customer email'),
  customerPhone: z.string().optional().describe('Customer phone'),
  productName: z.string().optional().describe('Product name'),
  appointmentName: z.string().optional().describe('Appointment name'),
  startTime: z.string().optional().describe('Booking start time'),
  endTime: z.string().optional().describe('Booking end time'),
  status: z.string().optional().describe('Booking status'),
  orderName: z.string().optional().describe('Order name'),
  quantity: z.number().optional().describe('Booking quantity'),
  raw: z.any().optional().describe('Raw booking data from the API')
});

let bookingEventOutputSchema = z
  .object({
    bookingId: z.number().describe('Booking ID'),
    customerName: z.string().optional().describe('Customer name'),
    customerEmail: z.string().optional().describe('Customer email'),
    customerPhone: z.string().optional().describe('Customer phone'),
    productName: z.string().optional().describe('Product name'),
    appointmentName: z.string().optional().describe('Appointment name'),
    startTime: z.string().optional().describe('Booking start time'),
    endTime: z.string().optional().describe('Booking end time'),
    status: z.string().optional().describe('Booking status'),
    orderName: z.string().optional().describe('Order name'),
    quantity: z.number().optional().describe('Booking quantity')
  })
  .passthrough();

export let bookingEvents = SlateTrigger.create(spec, {
  name: 'Booking Events',
  key: 'booking_events',
  description: 'Triggers when bookings are created, rescheduled, or canceled in Appointo.'
})
  .input(bookingEventInputSchema)
  .output(bookingEventOutputSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastSeenBookingIds: number[] = ctx.state?.lastSeenBookingIds ?? [];
      let lastSeenUpcomingIds: number[] = ctx.state?.lastSeenUpcomingIds ?? [];
      let lastPollTimestamp: string | undefined = ctx.state?.lastPollTimestamp;

      // Fetch upcoming bookings to detect new and rescheduled bookings
      let upcomingResult = await client.listBookings({ status: 'upcoming', limit: 100 });
      let upcomingBookings = Array.isArray(upcomingResult)
        ? upcomingResult
        : (upcomingResult?.bookings ?? upcomingResult?.data ?? []);

      // Fetch past bookings to detect cancellations
      let pastResult = await client.listBookings({ status: 'past', limit: 100 });
      let pastBookings = Array.isArray(pastResult)
        ? pastResult
        : (pastResult?.bookings ?? pastResult?.data ?? []);

      let allBookings = [...upcomingBookings, ...pastBookings];
      let currentUpcomingIds = upcomingBookings
        .map((b: any) => b.id ?? b.booking_id)
        .filter(Boolean);
      let allCurrentIds = allBookings.map((b: any) => b.id ?? b.booking_id).filter(Boolean);

      let inputs: z.infer<typeof bookingEventInputSchema>[] = [];

      let mapBooking = (b: any) => ({
        bookingId: b.id ?? b.booking_id,
        customerName: b.customer_name ?? b.name,
        customerEmail: b.customer_email ?? b.email,
        customerPhone: b.customer_phone ?? b.phone,
        productName: b.product_name,
        appointmentName: b.appointment_name,
        startTime: b.start_time ?? b.timestring,
        endTime: b.end_time,
        status: b.status,
        orderName: b.order_name,
        quantity: b.quantity
      });

      if (lastPollTimestamp) {
        // Detect new bookings (IDs not seen before)
        for (let booking of allBookings) {
          let bid = booking.id ?? booking.booking_id;
          if (bid && !lastSeenBookingIds.includes(bid)) {
            let mapped = mapBooking(booking);
            if (booking.status === 'cancelled' || booking.status === 'canceled') {
              inputs.push({ ...mapped, eventType: 'canceled', raw: booking });
            } else {
              inputs.push({ ...mapped, eventType: 'created', raw: booking });
            }
          }
        }

        // Detect cancellations: bookings that were in upcoming but are no longer there
        // and are not in past bookings (or appear with canceled status)
        for (let oldId of lastSeenUpcomingIds) {
          if (!currentUpcomingIds.includes(oldId)) {
            let pastMatch = pastBookings.find((b: any) => (b.id ?? b.booking_id) === oldId);
            if (
              pastMatch &&
              (pastMatch.status === 'cancelled' || pastMatch.status === 'canceled')
            ) {
              let mapped = mapBooking(pastMatch);
              if (!inputs.some(i => i.bookingId === oldId)) {
                inputs.push({ ...mapped, eventType: 'canceled', raw: pastMatch });
              }
            }
          }
        }
      }

      return {
        inputs,
        updatedState: {
          lastSeenBookingIds: allCurrentIds.slice(0, 200),
          lastSeenUpcomingIds: currentUpcomingIds.slice(0, 200),
          lastPollTimestamp: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `booking.${ctx.input.eventType}`,
        id: `booking_${ctx.input.bookingId}_${ctx.input.eventType}_${Date.now()}`,
        output: {
          bookingId: ctx.input.bookingId,
          customerName: ctx.input.customerName,
          customerEmail: ctx.input.customerEmail,
          customerPhone: ctx.input.customerPhone,
          productName: ctx.input.productName,
          appointmentName: ctx.input.appointmentName,
          startTime: ctx.input.startTime,
          endTime: ctx.input.endTime,
          status: ctx.input.status,
          orderName: ctx.input.orderName,
          quantity: ctx.input.quantity,
          ...(ctx.input.raw ?? {})
        }
      };
    }
  })
  .build();
