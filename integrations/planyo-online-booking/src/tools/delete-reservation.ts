import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let deleteReservation = SlateTool.create(spec, {
  name: 'Delete Reservation',
  key: 'delete_reservation',
  description: `Permanently deletes a reservation. **This cannot be undone.** For non-permanent removal, use the Reservation Action tool with action "Cancel" instead.`,
  constraints: ['This is a permanent, irreversible operation.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      reservationId: z.string().describe('ID of the reservation to permanently delete'),
      deleteOrphanedUser: z
        .boolean()
        .optional()
        .describe('Also delete the user if they have no other reservations')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the reservation was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    await client.deleteReservation(ctx.input.reservationId, ctx.input.deleteOrphanedUser);

    return {
      output: {
        deleted: true
      },
      message: `Reservation **#${ctx.input.reservationId}** permanently deleted.`
    };
  })
  .build();
