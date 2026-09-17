import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

// Lodgify requires structured first/last guest names and rejects the whole payload
// when neither is present, so the first whitespace-separated token becomes the first
// name and everything after it stays together as the last name. That keeps middle
// names and multi-word surnames ("Ana Maria Ruiz Gomez") intact instead of dropping
// them, and leaves the last name unset rather than empty for single-token names.
let splitGuestName = (fullName: string) => {
  let parts = fullName.trim().split(/\s+/);

  if (!parts[0]) {
    throw createApiServiceError('guestName cannot be empty. Provide the guest name.');
  }

  return {
    first_name: parts[0],
    last_name: parts.length > 1 ? parts.slice(1).join(' ') : undefined
  };
};

export let createBooking = SlateTool.create(spec, {
  name: 'Create Booking',
  key: 'create_booking',
  description: `Create a new booking/reservation for a property. Requires the property, room type, dates, and guest information. The booking can be created with different statuses (Booked, Open, Tentative, Declined). Returns the identifier of the new booking; read the full booking back with the Get Booking tool.`,
  instructions: [
    'Dates should be in YYYY-MM-DD format.',
    'At least one room with a room type ID and an adult count is required.',
    'Use the Get Property tool first to find valid room type IDs for a property.',
    'To turn an existing enquiry into a booking and keep its message history, pass fromEnquiryId instead of creating a separate booking.',
    'Admin notes cannot be set while creating a booking. Create the booking first, then set the note with the Update Booking tool.'
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
            people: z
              .number()
              .describe(
                'Number of adult guests for this room. Pass the full guest count here when you are not splitting out children and infants'
              ),
            children: z.number().optional().describe('Number of children in this room'),
            infants: z.number().optional().describe('Number of infants in this room'),
            pets: z.number().optional().describe('Number of pets in this room'),
            keyCode: z
              .string()
              .optional()
              .describe('PIN or key code given to the guest for accessing the rented property')
          })
        )
        .min(1)
        .describe('Rooms to book with guest counts'),
      arrival: z.string().describe('Arrival/check-in date (YYYY-MM-DD)'),
      departure: z.string().describe('Departure/check-out date (YYYY-MM-DD)'),
      guestName: z
        .string()
        .describe(
          'Full name of the guest. The first word is used as the first name and the remainder as the last name'
        ),
      guestEmail: z.string().optional().describe('Email address of the guest'),
      guestPhone: z.string().optional().describe('Phone number of the guest'),
      status: z
        .enum(['Booked', 'Open', 'Tentative', 'Declined'])
        .optional()
        .default('Booked')
        .describe(
          'Initial booking status. Use Declined only to record a request that was already declined elsewhere; to change the status later use the Update Booking Status tool'
        ),
      source: z.string().optional().describe('Booking source (e.g., "Manual", "Website")'),
      total: z
        .number()
        .optional()
        .describe(
          'Total booking amount. Leave unset to let Lodgify calculate the quote; when set, no pricing is calculated and currencyCode is required'
        ),
      currencyCode: z
        .string()
        .optional()
        .describe('Currency code (e.g., "USD", "EUR"). Required when total is set'),
      paymentWebsiteId: z
        .number()
        .optional()
        .describe(
          'ID of the website Lodgify should use as the payment gateway for this booking. The List Payment Settings tool shows the payment options a property has configured, which is useful context, but Lodgify does not document the identifiers it returns as payment website IDs'
        ),
      bookability: z
        .enum(['InstantBooking', 'BookingRequest', 'EnquiryOnly'])
        .optional()
        .describe('Booking policy to apply to this booking'),
      fromEnquiryId: z
        .number()
        .optional()
        .describe(
          'ID of an existing enquiry to upgrade into this booking. The message history of the enquiry is carried over to the new booking'
        ),
      notes: z
        .string()
        .optional()
        .describe(
          'Not accepted when creating a booking: Lodgify has no note field on new bookings. Create the booking first and set the admin note with the Update Booking tool. Passing a value here returns an error'
        ),
      language: z
        .string()
        .optional()
        .describe(
          'Language/locale code for the guest (e.g., "en"), stored as the guest locale'
        )
    })
  )
  .output(
    z.object({
      bookingId: z.number().describe('ID of the newly created booking'),
      booking: z
        .record(z.string(), z.any())
        .describe(
          'Minimal record of the created booking. Lodgify returns only the new identifier, so this holds just the id; use the Get Booking tool for the full booking'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.notes) {
      throw createApiServiceError(
        'Lodgify does not accept notes when a booking is created. Create the booking without notes, then set the admin note with the Update Booking tool (update_booking).'
      );
    }

    let created = await client.createBooking(
      {
        property_id: ctx.input.propertyId,
        rooms: ctx.input.rooms.map(r => ({
          room_type_id: r.roomTypeId,
          guest_breakdown: {
            adults: r.people,
            children: r.children,
            infants: r.infants,
            pets: r.pets
          },
          key_code: r.keyCode
        })),
        arrival: ctx.input.arrival,
        departure: ctx.input.departure,
        guest: {
          guest_name: splitGuestName(ctx.input.guestName),
          email: ctx.input.guestEmail,
          phone: ctx.input.guestPhone,
          locale: ctx.input.language
        },
        status: ctx.input.status,
        source_text: ctx.input.source,
        payment_website_id: ctx.input.paymentWebsiteId,
        bookability: ctx.input.bookability,
        total: ctx.input.total,
        currency_code: ctx.input.currencyCode
      },
      ctx.input.fromEnquiryId === undefined ? undefined : { from: ctx.input.fromEnquiryId }
    );

    // The endpoint answers with a bare integer id rather than a booking object.
    let bookingId = Number.parseInt(String(created), 10);

    if (!Number.isFinite(bookingId)) {
      throw createApiServiceError(
        'Lodgify did not return a booking ID for this request. Use the List Bookings tool to check whether the booking was created before retrying.'
      );
    }

    let upgraded = ctx.input.fromEnquiryId
      ? `, upgraded from enquiry #${ctx.input.fromEnquiryId}`
      : '';

    return {
      output: { bookingId, booking: { id: bookingId } },
      message: `Created booking **#${bookingId}** for **${ctx.input.guestName}** at property #${ctx.input.propertyId} (${ctx.input.arrival} to ${ctx.input.departure})${upgraded}.`
    };
  })
  .build();
