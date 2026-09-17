import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createBookingQuote = SlateTool.create(spec, {
  name: 'Create Booking Quote',
  key: 'create_booking_quote',
  description: `Create a quote for an existing booking, optionally including add-ons and custom room fees. A booking needs a quote before a payment link can be requested for it, so this is the step between creating a booking and collecting payment.`,
  instructions: [
    'Create the booking first, then create its quote, then generate the payment link.',
    "Add-on IDs come from the rate add-ons configured on the booking's property.",
    'Use the Get Quote tool later to read the current quote of a booking.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      bookingId: z.number().describe('The ID of the booking to create the quote for'),
      isPolicyActive: z
        .boolean()
        .optional()
        .describe('Create the quote with the payment and cancellation policies active'),
      addOns: z
        .array(
          z.object({
            addOnId: z.number().describe('Identifier of the add-on to include'),
            units: z
              .number()
              .optional()
              .describe('Number of units to reserve, for add-ons that are priced per unit')
          })
        )
        .optional()
        .describe('Add-ons to include in the quote'),
      roomTypes: z
        .array(
          z.object({
            roomTypeId: z.number().describe('Identifier of a room type on the booking'),
            customFeeAmount: z
              .number()
              .optional()
              .describe(
                'Custom fee amount to charge for this room type instead of the calculated one'
              )
          })
        )
        .optional()
        .describe('Room types on the booking and their specific quote details')
    })
  )
  .output(
    z.object({
      quoteId: z.number().describe('Identifier of the quote that was created'),
      bookingId: z.number().describe('The ID of the booking the quote belongs to'),
      quote: z
        .any()
        .describe(
          'The current quote of the booking including status, currency and amounts, or null if it could not be read back'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let created = await client.createBookingQuote(ctx.input.bookingId, {
      is_policy_active: ctx.input.isPolicyActive,
      add_ons: ctx.input.addOns?.map(addOn => ({
        add_on_id: addOn.addOnId,
        units: addOn.units
      })),
      room_types: ctx.input.roomTypes?.map(roomType => ({
        room_type_id: roomType.roomTypeId,
        custom_fee_amount: roomType.customFeeAmount
      }))
    });

    // The quote is already created at this point, so a failure to read the
    // pricing breakdown back must not turn a successful creation into an error.
    let quote: any = null;
    try {
      quote = await client.getBookingQuote(ctx.input.bookingId);
    } catch {
      quote = null;
    }

    let quoteId = Number(created) || Number(quote?.id);

    return {
      output: {
        quoteId,
        bookingId: ctx.input.bookingId,
        quote
      },
      message: `Created quote **#${quoteId}** for booking **#${ctx.input.bookingId}**.`
    };
  })
  .build();
