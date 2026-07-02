import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getQuote = SlateTool.create(spec, {
  name: 'Get Quote',
  key: 'get_quote',
  description: `Get a pricing quote for a property stay or retrieve the quote associated with an existing booking. When querying by property, returns a price estimate for the specified dates. When querying by booking, returns the current quote with full pricing breakdown including fees and taxes.`,
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
        .describe('Departure date for the quote (YYYY-MM-DD), required when using propertyId')
    })
  )
  .output(
    z.object({
      quote: z.any().describe('Quote details including pricing breakdown, fees, and taxes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let quote: any;
    if (ctx.input.bookingId) {
      quote = await client.getBookingQuote(ctx.input.bookingId);
      return {
        output: { quote },
        message: `Retrieved quote for booking **#${ctx.input.bookingId}**.`
      };
    }

    if (!ctx.input.propertyId || !ctx.input.arrival || !ctx.input.departure) {
      throw new Error(
        'Either bookingId or propertyId with arrival/departure dates must be provided.'
      );
    }

    quote = await client.getQuote(ctx.input.propertyId, {
      arrival: ctx.input.arrival,
      departure: ctx.input.departure
    });

    return {
      output: { quote },
      message: `Retrieved quote for property **#${ctx.input.propertyId}** from ${ctx.input.arrival} to ${ctx.input.departure}.`
    };
  })
  .build();
