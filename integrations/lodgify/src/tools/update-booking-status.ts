import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateBookingStatus = SlateTool.create(spec, {
  name: 'Update Booking Status',
  key: 'update_booking_status',
  description: `Change the status of an existing booking. Supports setting a booking to Booked, Open, Declined, or Tentative. This also updates the property's availability calendar accordingly.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      bookingId: z.number().describe('The ID of the booking to update'),
      status: z
        .enum(['booked', 'open', 'declined', 'tentative'])
        .describe('The new status to set for the booking')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the status update was successful'),
      bookingId: z.number().describe('The ID of the updated booking'),
      status: z.string().describe('The new status that was set')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let statusMap = {
      booked: 'book',
      open: 'open',
      declined: 'decline',
      tentative: 'tentative'
    } as const;

    let apiStatus = statusMap[ctx.input.status];
    await client.setBookingStatus(ctx.input.bookingId, apiStatus);

    return {
      output: {
        success: true,
        bookingId: ctx.input.bookingId,
        status: ctx.input.status
      },
      message: `Updated booking **#${ctx.input.bookingId}** status to **${ctx.input.status}**.`
    };
  })
  .build();
