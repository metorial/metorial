import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBookings = SlateTool.create(spec, {
  name: 'List Bookings',
  key: 'list_bookings',
  description: `Retrieve a list of bookings/reservations from Lodgify. Supports filtering by stay status, arrival or departure date, trash state, and update time. Can include transaction and quote details. Useful for viewing upcoming, current, or past reservations.`,
  instructions: [
    'Use stayFilter "ArrivalDate" or "DepartureDate" together with stayFilterDate to find bookings arriving or departing on a specific date.',
    'Trashed bookings are excluded unless you ask for them; use trashFilter "All" to see trashed and active bookings together.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      size: z.number().optional().describe('Number of bookings per page'),
      includeTransactions: z
        .boolean()
        .optional()
        .describe('Include payment/transaction data in results'),
      includeQuoteDetails: z
        .boolean()
        .optional()
        .describe('Include quote/pricing details in results'),
      includeExternal: z
        .boolean()
        .optional()
        .describe('Include bookings from external channels (Airbnb, Booking.com, etc.)'),
      stayFilter: z
        .enum(['Upcoming', 'Current', 'Historic', 'All', 'ArrivalDate', 'DepartureDate'])
        .optional()
        .describe(
          'Filter bookings by their stay dates. "Upcoming" for stays that have not started, "Current" for stays in progress, "Historic" for stays that have ended, "All" for every stay. "ArrivalDate" and "DepartureDate" are not stay windows: they match bookings arriving or departing on the exact date given in stayFilterDate, which is required with them'
        ),
      stayFilterDate: z
        .string()
        .optional()
        .describe(
          'Date to match when stayFilter is "ArrivalDate" or "DepartureDate" (ISO format YYYY-MM-DD). Ignored by the other stayFilter values'
        ),
      updatedSince: z
        .string()
        .optional()
        .describe('Only return bookings updated after this date (ISO datetime)'),
      includeTrash: z
        .boolean()
        .optional()
        .describe(
          'When true, return only bookings that are in the trash; when false, return only bookings that are not. Ignored if trashFilter is set, which also offers "All" for both at once'
        ),
      trashFilter: z
        .enum(['False', 'True', 'All'])
        .optional()
        .describe(
          'Trash state to query: "False" for bookings not in the trash, "True" for only trashed bookings, "All" for both. Takes precedence over includeTrash. Lodgify excludes trashed bookings when neither is set'
        )
    })
  )
  .output(
    z.object({
      bookings: z.array(z.record(z.string(), z.any())).describe('List of booking objects'),
      count: z
        .number()
        .optional()
        .describe(
          'Total number of bookings matching the filters across all pages, when Lodgify reports it'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let dateModes = ['ArrivalDate', 'DepartureDate'];

    if (
      ctx.input.stayFilter &&
      dateModes.includes(ctx.input.stayFilter) &&
      !ctx.input.stayFilterDate
    ) {
      throw createApiServiceError(
        `stayFilterDate is required when stayFilter is "${ctx.input.stayFilter}", because that filter matches bookings against a single arrival or departure date. Provide stayFilterDate, or use "Upcoming", "Current", "Historic", or "All" instead.`
      );
    }

    // `trash` is a three-state string enum upstream, so the boolean input covers only
    // its two-state case and the explicit filter wins when both are supplied.
    let trash: string | undefined = ctx.input.trashFilter;

    if (trash === undefined && ctx.input.includeTrash !== undefined) {
      trash = ctx.input.includeTrash ? 'True' : 'False';
    }

    let result = await client.listBookings({
      page: ctx.input.page,
      size: ctx.input.size,
      includeTransactions: ctx.input.includeTransactions,
      includeQuoteDetails: ctx.input.includeQuoteDetails,
      includeExternal: ctx.input.includeExternal,
      stayFilter: ctx.input.stayFilter,
      stayFilterDate: ctx.input.stayFilterDate,
      updatedSince: ctx.input.updatedSince,
      trash,
      includeCount: true
    });

    let bookings = Array.isArray(result?.items) ? result.items : [];
    let count = typeof result?.count === 'number' ? result.count : undefined;
    let total = count !== undefined && count > bookings.length ? ` (${count} total)` : '';

    return {
      output: { bookings, count },
      message: `Retrieved **${bookings.length}** bookings${total}.`
    };
  })
  .build();
