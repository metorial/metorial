import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBookingTrash = SlateTool.create(spec, {
  name: 'Manage Booking Trash',
  key: 'manage_booking_trash',
  description: `Move a booking to the trash or restore one that is already there. Trashing a booking hides it from the active booking list but keeps it recoverable, so it is not a permanent deletion and can be undone with the recover action.`,
  instructions: [
    'Use the trash action to remove a booking from the active list, and the recover action to bring a trashed booking back.',
    'Trashed bookings are still retrievable: list bookings with trashed items included to find them.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      bookingId: z.number().describe('The ID of the booking to trash or recover'),
      action: z
        .enum(['trash', 'recover'])
        .describe(
          'Use "trash" to move the booking to the trash, or "recover" to restore a booking that is currently in the trash'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation completed successfully'),
      bookingId: z.number().describe('The ID of the booking that was trashed or recovered'),
      action: z.enum(['trash', 'recover']).describe('The action that was performed'),
      isTrashed: z
        .boolean()
        .describe(
          'Whether the booking is in the trash after this operation. A trashed booking is kept and can be restored with the recover action.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    // Both endpoints answer with an empty body, so the result is built from the
    // action that was requested.
    if (ctx.input.action === 'trash') {
      await client.trashBooking(ctx.input.bookingId);

      return {
        output: {
          success: true,
          bookingId: ctx.input.bookingId,
          action: ctx.input.action,
          isTrashed: true
        },
        message: `Moved booking **#${ctx.input.bookingId}** to the trash. It can be restored with the recover action.`
      };
    }

    await client.recoverBooking(ctx.input.bookingId);

    return {
      output: {
        success: true,
        bookingId: ctx.input.bookingId,
        action: ctx.input.action,
        isTrashed: false
      },
      message: `Restored booking **#${ctx.input.bookingId}** from the trash.`
    };
  })
  .build();
