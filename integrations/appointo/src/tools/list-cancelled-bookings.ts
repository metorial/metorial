import { SlateTool } from 'slates';
import { z } from 'zod';
import { bookingSchema, mapBooking } from '../lib/bookings';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCancelledBookings = SlateTool.create(spec, {
  name: 'List Cancelled Bookings',
  key: 'list_cancelled_bookings',
  description:
    'Retrieve cancelled bookings for cancellation follow-up and reporting. Filter by past or upcoming times, or search by product, customer, email, phone, or order name.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().int().min(1).max(100).optional().describe('Page size, maximum 100'),
      offset: z.number().int().min(0).optional().describe('Pagination offset'),
      status: z.enum(['past', 'upcoming']).optional().describe('Filter by booking time'),
      searchTerm: z
        .string()
        .optional()
        .describe('Product, customer, email, phone, or order search')
    })
  )
  .output(z.object({ bookings: z.array(bookingSchema).describe('Cancelled bookings') }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCancelledBookings(ctx.input);
    let bookings = Array.isArray(result) ? result : (result?.bookings ?? result?.data ?? []);
    let mapped = bookings.map(mapBooking);
    return {
      output: { bookings: mapped },
      message: `Retrieved **${mapped.length}** cancelled booking(s).`
    };
  })
  .build();
