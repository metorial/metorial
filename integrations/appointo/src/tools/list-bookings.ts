import { SlateTool } from 'slates';
import { z } from 'zod';
import { bookingSchema, mapBooking } from '../lib/bookings';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBookings = SlateTool.create(spec, {
  name: 'List Bookings',
  key: 'list_bookings',
  description: `Retrieve bookings from Appointo. Filter by status (past or upcoming), search by product name, customer name, email, phone, or order name. Retrieve a specific booking by ID. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of bookings to return (max 100, default 100)'),
      offset: z.number().optional().describe('Pagination offset'),
      status: z.enum(['past', 'upcoming']).optional().describe('Filter by booking status'),
      bookingId: z.number().optional().describe('Retrieve a specific booking by ID'),
      searchTerm: z
        .string()
        .optional()
        .describe('Search by product name, customer name, email, phone, or order name')
    })
  )
  .output(
    z.object({
      bookings: z.array(bookingSchema).describe('List of bookings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listBookings({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      status: ctx.input.status,
      bookingId: ctx.input.bookingId,
      searchTerm: ctx.input.searchTerm
    });

    let bookings = Array.isArray(result) ? result : (result?.bookings ?? result?.data ?? []);

    let mapped = bookings.map(mapBooking);

    return {
      output: { bookings: mapped },
      message: `Retrieved **${mapped.length}** booking(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();
