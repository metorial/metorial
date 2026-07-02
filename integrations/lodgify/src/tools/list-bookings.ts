import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBookings = SlateTool.create(spec, {
  name: 'List Bookings',
  key: 'list_bookings',
  description: `Retrieve a list of bookings/reservations from Lodgify. Supports filtering by stay status, date, and update time. Can include transaction and quote details. Useful for viewing upcoming, current, or past reservations.`,
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
        .enum(['All', 'Current'])
        .optional()
        .describe('Filter bookings by stay status'),
      stayFilterDate: z
        .string()
        .optional()
        .describe('Date to use for the stay filter (ISO format YYYY-MM-DD)'),
      updatedSince: z
        .string()
        .optional()
        .describe('Only return bookings updated after this date (ISO datetime)'),
      includeTrash: z.boolean().optional().describe('Include trashed/deleted bookings')
    })
  )
  .output(
    z.object({
      bookings: z.array(z.record(z.string(), z.any())).describe('List of booking objects'),
      count: z.number().optional().describe('Total number of bookings if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listBookings({
      page: ctx.input.page,
      size: ctx.input.size,
      includeTransactions: ctx.input.includeTransactions,
      includeQuoteDetails: ctx.input.includeQuoteDetails,
      includeExternal: ctx.input.includeExternal,
      stayFilter: ctx.input.stayFilter,
      stayFilterDate: ctx.input.stayFilterDate,
      updatedSince: ctx.input.updatedSince,
      trash: ctx.input.includeTrash,
      includeCount: true
    });

    let bookings = Array.isArray(result) ? result : (result.items ?? []);
    let count = result.count ?? result.total_count ?? bookings.length;

    return {
      output: { bookings, count },
      message: `Retrieved **${bookings.length}** bookings${count > bookings.length ? ` (${count} total)` : ''}.`
    };
  })
  .build();
