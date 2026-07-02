import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBooking = SlateTool.create(spec, {
  name: 'Manage Booking',
  key: 'manage_booking',
  description: `Perform lifecycle actions on an existing booking: cancel, reschedule, confirm, decline, mark as no-show, reassign to another host, or add guests. Select the desired action and provide the required parameters.`,
  instructions: [
    'For rescheduling, provide a new start time in ISO 8601 UTC format.',
    'For reassigning, optionally specify a target userId; otherwise the system auto-assigns.',
    'Adding guests supports up to 10 guests per request.'
  ]
})
  .input(
    z.object({
      bookingUid: z.string().describe('UID of the booking to manage'),
      action: z
        .enum([
          'cancel',
          'reschedule',
          'confirm',
          'decline',
          'mark_no_show',
          'reassign',
          'add_guests'
        ])
        .describe('Action to perform on the booking'),
      cancellationReason: z
        .string()
        .optional()
        .describe('Reason for cancellation (used with cancel action)'),
      rescheduleStart: z
        .string()
        .optional()
        .describe('New start time for rescheduling (ISO 8601 UTC)'),
      rescheduleReason: z.string().optional().describe('Reason for rescheduling'),
      declineReason: z.string().optional().describe('Reason for declining the booking'),
      noShowHost: z.boolean().optional().describe('Whether to mark the host as no-show'),
      noShowAttendees: z
        .array(z.string())
        .optional()
        .describe('List of attendee emails to mark as no-show'),
      reassignToUserId: z
        .number()
        .optional()
        .describe('User ID to reassign the booking to (omit for auto-assign)'),
      guests: z
        .array(
          z.object({
            email: z.string().describe('Guest email'),
            name: z.string().optional().describe('Guest name')
          })
        )
        .optional()
        .describe('Guests to add to the booking'),
      seatUid: z.string().optional().describe('Seat UID for seated event operations')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Result of the booking action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result: any;
    let actionLabel = ctx.input.action;

    switch (ctx.input.action) {
      case 'cancel': {
        let data: Record<string, any> = {};
        if (ctx.input.cancellationReason)
          data.cancellationReason = ctx.input.cancellationReason;
        if (ctx.input.seatUid) data.seatUid = ctx.input.seatUid;
        result = await client.cancelBooking(ctx.input.bookingUid, data);
        break;
      }
      case 'reschedule': {
        let data: Record<string, any> = {};
        if (ctx.input.rescheduleStart) data.start = ctx.input.rescheduleStart;
        if (ctx.input.rescheduleReason) data.reschedulingReason = ctx.input.rescheduleReason;
        if (ctx.input.seatUid) data.seatUid = ctx.input.seatUid;
        result = await client.rescheduleBooking(ctx.input.bookingUid, data);
        break;
      }
      case 'confirm': {
        result = await client.confirmBooking(ctx.input.bookingUid);
        break;
      }
      case 'decline': {
        let data: Record<string, any> = {};
        if (ctx.input.declineReason) data.reason = ctx.input.declineReason;
        result = await client.declineBooking(ctx.input.bookingUid, data);
        break;
      }
      case 'mark_no_show': {
        let data: Record<string, any> = {};
        if (ctx.input.noShowHost !== undefined) data.noShowHost = ctx.input.noShowHost;
        if (ctx.input.noShowAttendees)
          data.attendees = ctx.input.noShowAttendees.map(email => ({ email, noShow: true }));
        result = await client.markNoShow(ctx.input.bookingUid, data);
        break;
      }
      case 'reassign': {
        result = await client.reassignBooking(
          ctx.input.bookingUid,
          ctx.input.reassignToUserId
        );
        break;
      }
      case 'add_guests': {
        result = await client.addGuests(ctx.input.bookingUid, ctx.input.guests || []);
        break;
      }
    }

    return {
      output: { result },
      message: `Booking **${ctx.input.bookingUid}** — action **${actionLabel}** completed.`
    };
  })
  .build();
