import { SlateTool } from 'slates';
import { z } from 'zod';
import { bookingSchema, mapBooking } from '../lib/booking';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBooking = SlateTool.create(spec, {
  name: 'Get Booking',
  key: 'get_booking',
  description: `Retrieve details of a specific booking by its ID, or list all bookings with pagination.
Returns booking status, customer details, voucher URL, and ticket links.`,
  instructions: [
    'Provide a bookingId to get a specific booking, or omit it to list all bookings.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bookingId: z
        .string()
        .optional()
        .describe('Specific booking ID to retrieve. Omit to list all bookings.'),
      offset: z.number().optional().describe('Pagination offset (only for listing)'),
      limit: z.number().optional().describe('Results per page (only for listing)')
    })
  )
  .output(
    z.object({
      bookings: z
        .array(bookingSchema)
        .describe('List of bookings (one item if querying by ID)'),
      total: z.number().optional().describe('Total number of bookings (only for listing)'),
      raw: z.unknown().optional().describe('Complete provider response'),
      nextOffset: z.number().optional().describe('Offset for the next page (only for listing)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      languageCode: ctx.config.languageCode,
      currencyCode: ctx.config.currencyCode
    });

    if (ctx.input.bookingId) {
      let booking = await client.getBooking(ctx.input.bookingId);
      let mapped = mapBooking(booking);
      for (let ticket of booking.tickets ?? []) {
        if (ticket.type === 'PDF_URL' && ticket.url) {
          await ctx.addAttachment({
            type: 'url',
            url: ticket.url,
            mimeType: 'application/pdf'
          });
        }
      }
      return {
        output: {
          bookings: [mapped],
          raw: booking,
          total: 1
        },
        message: `Booking **${mapped.bookingId}** — status: **${mapped.status}**${mapped.productName ? `, product: "${mapped.productName}"` : ''}.`
      };
    }

    let result = await client.listBookings({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let bookings = (result.items ?? []).map(mapBooking);

    return {
      output: {
        bookings,
        raw: result,
        total: result.total,
        nextOffset: result.nextOffset ?? undefined
      },
      message: `Found ${result.total ?? bookings.length} bookings. Showing ${bookings.length} results.`
    };
  })
  .build();
