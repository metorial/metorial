import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

let moneySchema = z.object({
  amount: z.number().describe('Monetary amount'),
  currency: z.string().describe('ISO 4217 currency code (e.g., EUR, USD)')
});

let guestSchema = z.object({
  title: z.enum(['Mr', 'Ms', 'Mrs', 'Dr', 'Prof', 'Other']).optional().describe('Guest title'),
  firstName: z.string().describe('First name'),
  lastName: z.string().describe('Last name'),
  email: z.string().optional().describe('Email address'),
  phone: z.string().optional().describe('Phone number')
});

let addressSchema = z.object({
  addressLine1: z.string().optional().describe('Street address line 1'),
  addressLine2: z.string().optional().describe('Street address line 2'),
  postalCode: z.string().optional().describe('Postal/ZIP code'),
  city: z.string().optional().describe('City'),
  countryCode: z.string().describe('ISO 3166-1 alpha-2 country code')
});

let reservationInputSchema = z.object({
  arrival: z.string().describe('Arrival date (YYYY-MM-DD)'),
  departure: z.string().describe('Departure date (YYYY-MM-DD)'),
  adults: z.number().describe('Number of adult guests'),
  childrenAges: z.array(z.number()).optional().describe('Ages of child guests'),
  primaryGuest: guestSchema.optional().describe('Primary guest for this reservation'),
  unitGroupId: z.string().optional().describe('Room type ID'),
  unitId: z.string().optional().describe('Specific room ID to assign'),
  guaranteeType: z
    .enum(['PM6Hold', 'CreditCard', 'Prepayment', 'Company', 'Ota'])
    .optional()
    .describe('Guarantee type'),
  travelPurpose: z.enum(['Business', 'Leisure']).optional().describe('Travel purpose'),
  channelCode: z
    .string()
    .optional()
    .describe('Distribution channel code (e.g., Direct, BookingCom)'),
  externalCode: z.string().optional().describe('External reference code'),
  guestComment: z.string().optional().describe('Guest comment or special request'),
  timeSlices: z
    .array(
      z.object({
        ratePlanId: z.string().describe('Rate plan ID for this time slice'),
        totalAmount: moneySchema
          .optional()
          .describe('Override total amount for this time slice')
      })
    )
    .optional()
    .describe(
      'Rate plan assignments per time slice; required when creating the reservation. Use search_offers to choose a rate plan.'
    ),
  source: z
    .string()
    .optional()
    .describe(
      'Supported source required when channelCode is ChannelManager; omit for other channels.'
    ),
  companyId: z.string().optional().describe('Company profile ID for corporate bookings'),
  corporateCode: z.string().optional().describe('Corporate rate code'),
  promoCode: z.string().optional().describe('Promotional code'),
  prePaymentAmount: moneySchema.optional().describe('Pre-payment amount')
});

export let createBooking = SlateTool.create(spec, {
  name: 'Create Booking',
  key: 'create_booking',
  description: `Create a new booking with one or more reservations. A booking groups reservations under a single booker. Each reservation represents a separate room stay. Supports rate plan assignments, guest details, corporate codes, and pre-payments.`,
  instructions: [
    'Each reservation needs arrival, departure, adults, and timeSlices. channelCode defaults to Direct.',
    'Use timeSlices to specify which rate plan to use for each night.',
    'If unitGroupId is not set, a room type must be determinable from the rate plan.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      booker: guestSchema
        .extend({
          address: addressSchema.optional().describe('Booker address')
        })
        .optional()
        .describe(
          'Booker information. If omitted, the primary guest of the first reservation is used.'
        ),
      comment: z.string().optional().describe('Internal booking comment'),
      bookerComment: z.string().optional().describe('Comment from the booker'),
      transactionReference: z
        .string()
        .optional()
        .describe('Payment transaction reference to complete when creating the booking.'),
      reservations: z
        .array(reservationInputSchema)
        .min(1)
        .describe('One or more reservations to create')
    })
  )
  .output(
    z.object({
      bookingId: z.string().describe('Created booking ID'),
      reservationIds: z.array(z.string()).describe('IDs of created reservations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApaleoClient(ctx.auth.token);
    let booker = ctx.input.booker ?? ctx.input.reservations[0]?.primaryGuest;
    if (!booker) {
      throw createApiServiceError(
        'Provide booker or the primaryGuest of the first reservation.'
      );
    }
    for (let reservation of ctx.input.reservations) {
      if (!reservation.timeSlices?.length) {
        throw createApiServiceError(
          'Every reservation requires timeSlices. Use search_offers to select a rate plan for each time slice.'
        );
      }
      if (reservation.channelCode === 'ChannelManager' && !reservation.source) {
        throw createApiServiceError('source is required when channelCode is ChannelManager.');
      }
      if (reservation.channelCode !== 'ChannelManager' && reservation.source !== undefined) {
        throw createApiServiceError(
          'source is only supported when channelCode is ChannelManager.'
        );
      }
      if (reservation.unitGroupId) {
        for (let ratePlanId of new Set(
          reservation.timeSlices.map(slice => slice.ratePlanId)
        )) {
          let ratePlan = await client.getRatePlan(ratePlanId);
          if (ratePlan.unitGroup?.id !== reservation.unitGroupId) {
            throw createApiServiceError(
              `Rate plan ${ratePlanId} does not belong to unitGroupId ${reservation.unitGroupId}. Choose a matching rate plan from list_rate_plans.`
            );
          }
        }
      }
    }

    let result = await client.createBooking({
      booker,
      comment: ctx.input.comment,
      bookerComment: ctx.input.bookerComment,
      transactionReference: ctx.input.transactionReference,
      reservations: ctx.input.reservations.map(({ unitId, unitGroupId, ...reservation }) => ({
        ...reservation,
        channelCode: reservation.channelCode ?? 'Direct'
      }))
    });

    let bookingId = result.id;
    let reservationIds = (result.reservationIds || []).map(
      (reservation: string | { id: string }) =>
        typeof reservation === 'string' ? reservation : reservation.id
    );
    for (let [index, reservation] of ctx.input.reservations.entries()) {
      if (reservation.unitId) {
        let reservationId = reservationIds[index];
        if (!reservationId) {
          throw createApiServiceError(
            `Booking ${bookingId} was created, but no reservation ID was returned for room assignment. Retrieve it with get_booking before assigning the room.`
          );
        }
        try {
          await client.assignUnit(reservationId, reservation.unitId);
        } catch (error) {
          throw createApiServiceError(
            `Booking ${bookingId} was created with reservation ${reservationId}, but assigning room ${reservation.unitId} failed. Retrieve the reservation and retry assign_unit with manage_reservation.`,
            { parent: error }
          );
        }
      }
    }

    return {
      output: {
        bookingId,
        reservationIds
      },
      message: `Created booking **${bookingId}** with **${reservationIds.length}** reservation(s): ${reservationIds.join(', ')}.`
    };
  })
  .build();
