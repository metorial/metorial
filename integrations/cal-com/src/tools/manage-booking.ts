import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { calComServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageBooking = SlateTool.create(spec, {
  name: 'Manage Booking',
  key: 'manage_booking',
  description: `Perform lifecycle actions on an existing booking: cancel, reschedule, request a reschedule, confirm, decline, mark absence, reassign to another host, add guests, or update the booking location. Select the desired action and provide the required parameters.`,
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
          'request_reschedule',
          'confirm',
          'decline',
          'mark_no_show',
          'reassign',
          'add_guests',
          'update_location'
        ])
        .describe('Action to perform on the booking'),
      cancellationReason: z
        .string()
        .optional()
        .describe('Reason for cancellation (used with cancel action)'),
      cancelSubsequentBookings: z
        .boolean()
        .optional()
        .describe('Cancel subsequent recurring bookings when canceling a recurring booking'),
      rescheduleStart: z
        .string()
        .optional()
        .describe('New start time for rescheduling (ISO 8601 UTC)'),
      rescheduleReason: z.string().optional().describe('Reason for rescheduling'),
      rescheduledBy: z
        .string()
        .optional()
        .describe('Name or email of the person who rescheduled the booking'),
      emailVerificationCode: z
        .string()
        .optional()
        .describe('Email verification code required by some rescheduling flows'),
      rescheduleRequestReason: z
        .string()
        .optional()
        .describe('Reason to send when requesting that a booking be rescheduled'),
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
            name: z.string().optional().describe('Guest name'),
            timeZone: z.string().optional().describe('Guest time zone')
          })
        )
        .optional()
        .describe('Guests to add to the booking'),
      location: z.any().optional().describe('Cal.com location object for update_location'),
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
        if (ctx.input.cancelSubsequentBookings !== undefined)
          data.cancelSubsequentBookings = ctx.input.cancelSubsequentBookings;
        if (ctx.input.seatUid) data.seatUid = ctx.input.seatUid;
        result = await client.cancelBooking(ctx.input.bookingUid, data);
        break;
      }
      case 'reschedule': {
        if (!ctx.input.rescheduleStart) {
          throw calComServiceError('rescheduleStart is required for reschedule.');
        }

        let data: Record<string, any> = {};
        data.start = ctx.input.rescheduleStart;
        if (ctx.input.rescheduleReason) data.reschedulingReason = ctx.input.rescheduleReason;
        if (ctx.input.rescheduledBy) data.rescheduledBy = ctx.input.rescheduledBy;
        if (ctx.input.emailVerificationCode)
          data.emailVerificationCode = ctx.input.emailVerificationCode;
        if (ctx.input.seatUid) data.seatUid = ctx.input.seatUid;
        result = await client.rescheduleBooking(ctx.input.bookingUid, data);
        break;
      }
      case 'request_reschedule': {
        if (!ctx.input.rescheduleRequestReason) {
          throw calComServiceError(
            'rescheduleRequestReason is required for request_reschedule.'
          );
        }

        result = await client.requestRescheduleBooking(ctx.input.bookingUid, {
          rescheduleReason: ctx.input.rescheduleRequestReason
        });
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
        if (
          ctx.input.noShowHost === undefined &&
          (!ctx.input.noShowAttendees || ctx.input.noShowAttendees.length === 0)
        ) {
          throw calComServiceError(
            'noShowHost or at least one noShowAttendees email is required for mark_no_show.'
          );
        }

        let data: Record<string, any> = {};
        if (ctx.input.noShowHost !== undefined) data.host = ctx.input.noShowHost;
        if (ctx.input.noShowAttendees)
          data.attendees = ctx.input.noShowAttendees.map(email => ({ email, absent: true }));
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
        if (!ctx.input.guests || ctx.input.guests.length === 0) {
          throw calComServiceError('At least one guest is required for add_guests.');
        }

        result = await client.addGuests(ctx.input.bookingUid, ctx.input.guests);
        break;
      }
      case 'update_location': {
        if (!ctx.input.location) {
          throw calComServiceError('location is required for update_location.');
        }

        result = await client.updateBookingLocation(ctx.input.bookingUid, ctx.input.location);
        break;
      }
    }

    return {
      output: { result },
      message: `Booking **${ctx.input.bookingUid}** — action **${actionLabel}** completed.`
    };
  })
  .build();
