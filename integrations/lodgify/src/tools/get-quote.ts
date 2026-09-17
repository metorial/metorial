import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getQuote = SlateTool.create(spec, {
  name: 'Get Quote',
  key: 'get_quote',
  description: `Get a pricing quote for a property stay or retrieve the quote associated with an existing booking. When querying by property, returns one price estimate per applicable rate plan for the specified dates, optionally priced for a specific guest breakdown, add-ons, and promotion code. When querying by booking, returns the single current quote with full pricing breakdown including fees and taxes.`,
  instructions: [
    'Provide either bookingId, or propertyId with arrival and departure dates.',
    'roomTypes, addOns, and promotionCode only apply to the propertyId branch; the quote of an existing booking is returned as it was priced.',
    'Quotes for a property are priced per rate plan, so the propertyId branch can return several quotes for the same dates.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      propertyId: z
        .number()
        .optional()
        .describe('The property ID to get a quote for (for new stay estimates)'),
      bookingId: z
        .number()
        .optional()
        .describe('The booking ID to get the existing quote for'),
      arrival: z
        .string()
        .optional()
        .describe('Arrival date for the quote (YYYY-MM-DD), required when using propertyId'),
      departure: z
        .string()
        .optional()
        .describe('Departure date for the quote (YYYY-MM-DD), required when using propertyId'),
      roomTypes: z
        .array(
          z.object({
            roomTypeId: z.number().describe('Room type ID to price within the property'),
            adults: z.number().describe('Number of adults staying in this room type'),
            children: z.number().optional().describe('Number of children in this room type'),
            infants: z.number().optional().describe('Number of infants in this room type'),
            pets: z.number().optional().describe('Number of pets in this room type')
          })
        )
        .optional()
        .describe(
          'Room types to price with their guest breakdown (propertyId branch only). Use the Get Property tool to find room type IDs. Rates and fees depend on the guest counts, so pass them for an accurate estimate'
        ),
      addOns: z
        .array(
          z.object({
            addOnId: z.number().describe('Add-on ID to include in the quote'),
            units: z
              .number()
              .optional()
              .describe('Number of units to include, for add-ons priced per unit')
          })
        )
        .optional()
        .describe(
          'Optional add-ons to include in the quote (propertyId branch only). Use the List Rate Addons tool to find add-on IDs'
        ),
      promotionCode: z
        .string()
        .optional()
        .describe('Optional promotion code to apply to the quote (propertyId branch only)')
    })
  )
  .output(
    z.object({
      quote: z
        .any()
        .describe(
          'Quote details including pricing breakdown, fees, and taxes. A single quote object when queried by bookingId; a list of quotes, one per applicable rate plan, when queried by propertyId'
        ),
      quotes: z
        .array(z.any())
        .describe(
          'The returned quotes as a list regardless of which input was used: one entry for the bookingId branch, one entry per applicable rate plan for the propertyId branch'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let quote: any;
    if (ctx.input.bookingId) {
      if (ctx.input.roomTypes?.length || ctx.input.addOns?.length || ctx.input.promotionCode) {
        throw createApiServiceError(
          'roomTypes, addOns, and promotionCode cannot be applied to the quote of an existing booking. Omit them to read the booking quote, or use propertyId with arrival/departure to price a new stay.'
        );
      }

      quote = await client.getBookingQuote(ctx.input.bookingId);
      return {
        output: { quote, quotes: [quote] },
        message: `Retrieved quote for booking **#${ctx.input.bookingId}**.`
      };
    }

    if (!ctx.input.propertyId || !ctx.input.arrival || !ctx.input.departure) {
      throw createApiServiceError(
        'Either bookingId or propertyId with arrival/departure dates must be provided.'
      );
    }

    quote = await client.getPropertyQuote(ctx.input.propertyId, {
      arrival: ctx.input.arrival,
      departure: ctx.input.departure,
      // `People` is deprecated in favour of the guest breakdown but is still passed in
      // Lodgify's own documented example, so it is mirrored from the adult count it was
      // replaced by; the two can never disagree.
      roomTypes: ctx.input.roomTypes?.map(r => ({
        Id: r.roomTypeId,
        People: r.adults,
        guest_breakdown: {
          adults: r.adults,
          children: r.children,
          infants: r.infants,
          pets: r.pets
        }
      })),
      addOns: ctx.input.addOns?.map(a => ({ Id: a.addOnId, Units: a.units })),
      promotionCode: ctx.input.promotionCode
    });

    let quotes = Array.isArray(quote) ? quote : [quote];

    return {
      output: { quote, quotes },
      message: `Retrieved **${quotes.length}** quote${quotes.length === 1 ? '' : 's'} for property **#${ctx.input.propertyId}** from ${ctx.input.arrival} to ${ctx.input.departure}.`
    };
  })
  .build();
