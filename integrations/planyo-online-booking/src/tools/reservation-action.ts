import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let reservationAction = SlateTool.create(spec, {
  name: 'Reservation Action',
  key: 'reservation_action',
  description: `Performs an administrative action on a reservation such as confirming, cancelling, checking in/out, marking as no-show, or other status changes.

Available actions: **Confirm**, **Cancel** (admin cancel), **User_cancel** (customer cancel), **Checkin**, **Checkout**, **Noshow**, **Clear_checkin**, **Clear_noshow**, **Unconfirm**, **Uncancel**, **Lock**, **Unlock**, **Preapprove**, **Verify**, **Mark_as_quote**, **Promote** (from waitlist).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      reservationId: z.string().describe('ID of the reservation'),
      action: z
        .enum([
          'Reserve',
          'Verify',
          'Confirm',
          'Preapprove',
          'Fraud',
          'Cancel',
          'User_cancel',
          'Checkin',
          'Clear_checkin',
          'Checkout',
          'Noshow',
          'Clear_noshow',
          'Unconfirm',
          'Uncancel',
          'Make_not_completed',
          'Mark_as_quote',
          'Lock',
          'Unlock',
          'Promote'
        ])
        .describe('Action to perform on the reservation'),
      comment: z.string().optional().describe('Comment about the action'),
      suppressNotifications: z
        .boolean()
        .optional()
        .describe('Suppress email notifications for this action')
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('Updated reservation status'),
      userText: z.string().optional().describe('Display text for the customer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let result = await client.doReservationAction(ctx.input.reservationId, ctx.input.action, {
      comment: ctx.input.comment,
      isQuiet: ctx.input.suppressNotifications
    });

    return {
      output: {
        status: result?.status ? String(result.status) : undefined,
        userText: result?.user_text
      },
      message: `Action **${ctx.input.action}** performed on reservation **#${ctx.input.reservationId}**.`
    };
  })
  .build();
