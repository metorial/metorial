import { SlateTool } from 'slates';
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
      'Rate plan assignments per time slice. If not set, the default rate plan is used.'
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
    'At minimum, each reservation needs arrival, departure, and adults count.',
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

    let result = await client.createBooking({
      booker: ctx.input.booker,
      comment: ctx.input.comment,
      bookerComment: ctx.input.bookerComment,
      reservations: ctx.input.reservations
    });

    let bookingId = result.id;
    let reservationIds = (result.reservationIds || []) as string[];

    return {
      output: {
        bookingId,
        reservationIds
      },
      message: `Created booking **${bookingId}** with **${reservationIds.length}** reservation(s): ${reservationIds.join(', ')}.`
    };
  })
  .build();
