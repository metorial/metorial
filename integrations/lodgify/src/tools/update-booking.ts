import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

// Lodgify updates a booking with a full-document PUT, so anything left out of
// the body is cleared or bound to its .NET default: omitting `is_deleted` would
// untrash the booking and omitting `total_paid` would zero it. Every field the
// update model declares is therefore replayed from the read that happens
// immediately before the PUT, which makes the echoed values current rather than
// stale. Left out below are `people` and `property_name`, a deprecated alias of
// the room guest breakdowns and a display value that follows from
// `property_id`; `messages`, which has its own append endpoint and whose items
// carry no identity here, so echoing the thread would most likely duplicate it;
// and the price fields, handled separately. The booking returned on read also
// carries `total_guest_breakdown`, `check_in` and `check_out`, which the update
// model does not declare and rejects outright.
let ROUND_TRIPPED_FIELDS = [
  'id',
  'type',
  'booking_type',
  'status',
  'source',
  'source_text',
  'arrival',
  'departure',
  'property_id',
  'created_at',
  'is_replied',
  'updated_at',
  'is_deleted',
  'date_deleted',
  'total_paid',
  'amount_to_pay',
  'thread_uid',
  'note',
  'payment_type',
  'payment_address',
  'payment_website_id'
];

// Lodgify only calculates the quote when no total is sent, so replaying the
// total pins the old price. Arrival, departure and the room guest breakdowns
// all move the price, which is why these two are round tripped only when the
// caller changes none of them. The currency code is documented as required
// whenever a total is given, so the pair travels together or not at all.
let PRICE_FIELDS = ['total_amount', 'currency'];

// The guest update model has no `external_id`, and it takes a single `phone`
// where the read model returns a `phone_numbers` array, so neither survives an
// update. `full_name` is read-only, `country_name` follows from `country_code`,
// and `name` is a deprecated duplicate of `guest_name`.
let ROUND_TRIPPED_GUEST_FIELDS = [
  'id',
  'email',
  'phone',
  'locale',
  'street_address1',
  'street_address2',
  'city',
  'country_code',
  'postal_code',
  'state'
];

let pickFields = (source: Record<string, any>, fields: string[]) => {
  let picked: Record<string, any> = {};

  for (let field of fields) {
    if (source[field] !== undefined) picked[field] = source[field];
  }

  return picked;
};

let toWritableGuest = (guest: Record<string, any> | undefined) => {
  let current = guest ?? {};

  return {
    ...pickFields(current, ROUND_TRIPPED_GUEST_FIELDS),
    guest_name: pickFields(current.guest_name ?? {}, ['first_name', 'last_name'])
  };
};

// `name` follows from `room_type_id` and `people` is a deprecated alias of
// `guest_breakdown.adults`, so only the authoritative fields are sent.
let toWritableRoom = (room: Record<string, any>) => ({
  room_type_id: room.room_type_id,
  guest_breakdown: room.guest_breakdown ?? {},
  key_code: room.key_code
});

export let updateBooking = SlateTool.create(spec, {
  name: 'Update Booking',
  key: 'update_booking',
  description: `Update the details of an existing booking, including the admin note, stay dates, guest contact details, rooms and guest counts, booking source and payment website. Fields you do not provide keep their current values, except the guest's external ID and any additional phone numbers, which a booking update cannot carry through.`,
  instructions: [
    'Dates use YYYY-MM-DD format.',
    'Use the Update Booking Status tool to change a booking between Booked, Open, Declined and Tentative.',
    'Use the Manage Booking Stay tool to record actual check-in and check-out times.',
    'Providing rooms replaces the booking room list, so include every room the booking should keep.',
    'Changing the arrival date, the departure date or any room guest count causes the booking total to be recalculated, because all three affect the price. An update that leaves all three alone keeps the current total and currency.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      bookingId: z.number().describe('The ID of the booking to update'),
      note: z
        .string()
        .optional()
        .describe('Admin note about the booking. Replaces the note currently stored.'),
      arrival: z.string().optional().describe('New arrival/check-in date (YYYY-MM-DD)'),
      departure: z.string().optional().describe('New departure/check-out date (YYYY-MM-DD)'),
      guestFirstName: z.string().optional().describe('First name of the guest'),
      guestLastName: z.string().optional().describe('Last name of the guest'),
      guestEmail: z.string().optional().describe('Email address of the guest'),
      guestPhone: z.string().optional().describe('Phone number of the guest'),
      rooms: z
        .array(
          z.object({
            roomTypeId: z.number().describe('Room type ID within the property'),
            adults: z.number().optional().describe('Number of adults staying in this room'),
            children: z
              .number()
              .optional()
              .describe('Number of children staying in this room'),
            infants: z.number().optional().describe('Number of infants staying in this room'),
            pets: z.number().optional().describe('Number of pets staying in this room'),
            keyCode: z
              .string()
              .optional()
              .describe('Access code the guest uses to enter this room')
          })
        )
        .optional()
        .describe(
          'The full list of rooms the booking should have after the update. Rooms that are left out are removed from the booking. For a room that is already on the booking, guest counts and access codes you do not provide keep their current values.'
        ),
      sourceText: z
        .string()
        .optional()
        .describe('Free-text description of where the booking came from'),
      paymentWebsiteId: z
        .number()
        .optional()
        .describe('ID of the website used as the payment gateway for this booking')
    })
  )
  .output(
    z.object({
      bookingId: z.number().describe('The ID of the updated booking'),
      propertyId: z.number().optional().describe('ID of the property the booking belongs to'),
      status: z.string().optional().describe('Status of the booking after the update'),
      arrival: z.string().optional().describe('Arrival date after the update'),
      departure: z.string().optional().describe('Departure date after the update'),
      guestName: z.string().describe('Name of the guest on the booking after the update'),
      booking: z.record(z.string(), z.any()).describe('Full booking details after the update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let {
      bookingId,
      note,
      arrival,
      departure,
      guestFirstName,
      guestLastName,
      guestEmail,
      guestPhone,
      rooms,
      sourceText,
      paymentWebsiteId
    } = ctx.input;

    let changes = [
      note,
      arrival,
      departure,
      guestFirstName,
      guestLastName,
      guestEmail,
      guestPhone,
      rooms,
      sourceText,
      paymentWebsiteId
    ];

    if (changes.every(change => change === undefined)) {
      throw createApiServiceError(
        'No changes were provided. Supply at least one of note, arrival, departure, guestFirstName, guestLastName, guestEmail, guestPhone, rooms, sourceText or paymentWebsiteId.'
      );
    }

    // The stay dates and the room guest breakdowns are the inputs that change
    // what the booking costs.
    let changesPricing =
      arrival !== undefined || departure !== undefined || rooms !== undefined;

    let current = await client.getBookingDetails(bookingId);
    let currentRooms: Record<string, any>[] = Array.isArray(current.rooms)
      ? current.rooms.map(toWritableRoom)
      : [];

    let payload: Record<string, any> = {
      ...pickFields(current, ROUND_TRIPPED_FIELDS),
      guest: toWritableGuest(current.guest)
    };

    // Leaving the total out is what asks Lodgify to requote; sending it back
    // would bill the new dates or occupancy at the old price.
    if (!changesPricing) Object.assign(payload, pickFields(current, PRICE_FIELDS));

    if (currentRooms.length > 0) payload.rooms = currentRooms;

    if (note !== undefined) payload.note = note;
    if (arrival !== undefined) payload.arrival = arrival;
    if (departure !== undefined) payload.departure = departure;
    if (sourceText !== undefined) payload.source_text = sourceText;
    if (paymentWebsiteId !== undefined) payload.payment_website_id = paymentWebsiteId;

    if (guestFirstName !== undefined) payload.guest.guest_name.first_name = guestFirstName;
    if (guestLastName !== undefined) payload.guest.guest_name.last_name = guestLastName;
    if (guestEmail !== undefined) payload.guest.email = guestEmail;
    if (guestPhone !== undefined) payload.guest.phone = guestPhone;

    if (rooms !== undefined) {
      payload.rooms = rooms.map(room => {
        let existing = currentRooms.find(known => known.room_type_id === room.roomTypeId);
        let breakdown: Record<string, any> = { ...(existing?.guest_breakdown ?? {}) };

        if (room.adults !== undefined) breakdown.adults = room.adults;
        if (room.children !== undefined) breakdown.children = room.children;
        if (room.infants !== undefined) breakdown.infants = room.infants;
        if (room.pets !== undefined) breakdown.pets = room.pets;

        return {
          room_type_id: room.roomTypeId,
          guest_breakdown: breakdown,
          key_code: room.keyCode !== undefined ? room.keyCode : existing?.key_code
        };
      });
    }

    await client.updateBooking(bookingId, payload);

    let booking = await client.getBookingDetails(bookingId);
    let guestNameParts = booking.guest?.guest_name ?? {};
    let guestName =
      guestNameParts.full_name ||
      [guestNameParts.first_name, guestNameParts.last_name].filter(Boolean).join(' ') ||
      'Unknown guest';

    return {
      output: {
        bookingId,
        propertyId: booking.property_id,
        status: booking.status,
        arrival: booking.arrival,
        departure: booking.departure,
        guestName,
        booking
      },
      message: `Updated booking **#${bookingId}** for **${guestName}** (${booking.arrival} to ${booking.departure}).`
    };
  })
  .build();
