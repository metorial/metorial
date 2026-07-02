import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createBooking = SlateTool.create(spec, {
  name: 'Create Booking',
  key: 'create_booking',
  description: `Create a new booking/reservation for a property. Requires the property, room type, dates, and guest information. The booking can be created with different statuses (Booked, Open, Tentative).`,
  instructions: [
    'Dates should be in YYYY-MM-DD format.',
    'At least one room with a room_type_id and people count is required.',
    'Use the Get Property tool first to find valid room type IDs for a property.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      propertyId: z.number().describe('The ID of the property for this booking'),
      rooms: z
        .array(
          z.object({
            roomTypeId: z.number().describe('Room type ID within the property'),
            people: z.number().describe('Number of guests for this room')
          })
        )
        .min(1)
        .describe('Rooms to book with guest counts'),
      arrival: z.string().describe('Arrival/check-in date (YYYY-MM-DD)'),
      departure: z.string().describe('Departure/check-out date (YYYY-MM-DD)'),
      guestName: z.string().describe('Full name of the guest'),
      guestEmail: z.string().optional().describe('Email address of the guest'),
      guestPhone: z.string().optional().describe('Phone number of the guest'),
      status: z
        .enum(['Booked', 'Open', 'Tentative'])
        .optional()
        .default('Booked')
        .describe('Initial booking status'),
      source: z.string().optional().describe('Booking source (e.g., "Manual", "Website")'),
      total: z.number().optional().describe('Total booking amount'),
      currencyCode: z.string().optional().describe('Currency code (e.g., "USD", "EUR")'),
      notes: z.string().optional().describe('Internal notes for this booking'),
      language: z.string().optional().describe('Guest language code (e.g., "en")')
    })
  )
  .output(
    z.object({
      booking: z.record(z.string(), z.any()).describe('The created booking details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let booking = await client.createBooking({
      property_id: ctx.input.propertyId,
      rooms: ctx.input.rooms.map(r => ({
        room_type_id: r.roomTypeId,
        people: r.people
      })),
      arrival: ctx.input.arrival,
      departure: ctx.input.departure,
      guest: {
        name: ctx.input.guestName,
        email: ctx.input.guestEmail,
        phone: ctx.input.guestPhone
      },
      status: ctx.input.status,
      source: ctx.input.source,
      total: ctx.input.total,
      currency_code: ctx.input.currencyCode,
      notes: ctx.input.notes,
      language: ctx.input.language
    });

    let bookingId = booking.id ?? booking.booking_id ?? 'unknown';

    return {
      output: { booking },
      message: `Created booking **#${bookingId}** for **${ctx.input.guestName}** at property #${ctx.input.propertyId} (${ctx.input.arrival} to ${ctx.input.departure}).`
    };
  })
  .build();
