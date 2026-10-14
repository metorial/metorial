import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

export let listBookings = SlateTool.create(spec, {
  name: 'List Bookings',
  key: 'list_bookings',
  description:
    'Search bookings by booker text, reservation, group, booking IDs, channel, external code, or payment account status. Returns booking IDs and paginated booking details.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      reservationId: z.string().optional(),
      groupId: z.string().optional(),
      bookingIds: z.array(z.string()).optional(),
      channelCode: z.array(z.string()).optional(),
      externalCode: z.string().optional(),
      textSearch: z.string().optional(),
      hasActivePaymentAccount: z.boolean().optional(),
      pageNumber: z.number().optional().describe('Page number, starting at 1.'),
      pageSize: z.number().optional().describe('Results per page, up to 500.')
    })
  )
  .output(
    z.object({
      bookings: z.array(z.object({ bookingId: z.string() }).passthrough()),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new ApaleoClient(ctx.auth.token).listBookings(ctx.input);
    let bookings = (result.bookings ?? []).map((booking: { id: string }) => ({
      ...booking,
      bookingId: booking.id
    }));
    let count = result.count ?? bookings.length;
    return { output: { bookings, count }, message: `Found **${count}** bookings.` };
  })
  .build();
