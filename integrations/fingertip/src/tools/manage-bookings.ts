import { SlateTool } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

let bookingOutputSchema = z.object({
  bookingId: z.string(),
  siteId: z.string().nullable(),
  eventTypeId: z.string().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  status: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().nullable(),
  attendees: z.any().nullable(),
  cancellationReason: z.string().nullable(),
  rescheduled: z.boolean().nullable(),
  isRecorded: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export let listBookings = SlateTool.create(spec, {
  name: 'List Bookings',
  key: 'list_bookings',
  description: `List bookings (appointments/scheduled events) for a site. Supports filtering by status with cursor-based pagination.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      siteId: z.string().describe('ID of the site to list bookings for'),
      status: z
        .enum([
          'CANCELLED',
          'ACCEPTED',
          'REJECTED',
          'PENDING',
          'COMPLETED',
          'NO_SHOW',
          'REFUNDED',
          'PENDING_CONFIRMATION'
        ])
        .optional()
        .describe('Filter by booking status'),
      cursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of items per page (default: 10, max: 25)')
    })
  )
  .output(
    z.object({
      bookings: z.array(bookingOutputSchema),
      total: z.number(),
      hasNextPage: z.boolean(),
      endCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let result = await client.listBookings({
      siteId: ctx.input.siteId,
      status: ctx.input.status,
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize
    });

    let bookings = result.items.map(b => ({
      bookingId: b.id,
      siteId: b.siteId,
      eventTypeId: b.eventTypeId,
      title: b.title,
      description: b.description,
      status: b.status,
      startTime: b.startTime,
      endTime: b.endTime,
      location: b.location,
      attendees: b.attendees,
      cancellationReason: b.cancellationReason,
      rescheduled: b.rescheduled,
      isRecorded: b.isRecorded,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt
    }));

    return {
      output: {
        bookings,
        total: result.total,
        hasNextPage: result.pageInfo.hasNextPage,
        endCursor: result.pageInfo.endCursor
      },
      message: `Found **${result.total}** booking(s). Returned ${bookings.length} on this page.`
    };
  })
  .build();

export let manageBooking = SlateTool.create(spec, {
  name: 'Manage Booking',
  key: 'manage_booking',
  description: `Perform actions on a booking: accept, decline, complete, reschedule, or cancel. Use the \`action\` field to specify the desired operation.`,
  instructions: [
    'For "reschedule", provide newStartTime and newEndTime in ISO 8601 format.',
    'For "decline" or "cancel", optionally provide a cancellationReason.',
    'For "complete", optionally mark as noShow or specify a chargeAmountInCents.'
  ]
})
  .input(
    z.object({
      bookingId: z.string().describe('ID of the booking'),
      siteId: z.string().describe('ID of the site the booking belongs to'),
      action: z
        .enum(['accept', 'decline', 'complete', 'reschedule', 'cancel'])
        .describe('Action to perform on the booking'),
      cancellationReason: z.string().optional().describe('Reason for cancellation or decline'),
      chargeCancellationFee: z
        .boolean()
        .optional()
        .describe('Whether to charge cancellation fee (for cancel action)'),
      noShow: z.boolean().optional().describe('Mark as no-show (for complete action)'),
      chargeAmountInCents: z
        .number()
        .optional()
        .describe('Amount to charge in cents (for complete action)'),
      newStartTime: z
        .string()
        .optional()
        .describe('New start time in ISO 8601 format (for reschedule action)'),
      newEndTime: z
        .string()
        .optional()
        .describe('New end time in ISO 8601 format (for reschedule action)')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let { bookingId, siteId, action } = ctx.input;
    let result: { success: boolean };

    switch (action) {
      case 'accept':
        result = await client.acceptBooking(bookingId, siteId);
        break;
      case 'decline':
        result = await client.declineBooking(bookingId, siteId, ctx.input.cancellationReason);
        break;
      case 'complete':
        result = await client.completeBooking(bookingId, siteId, {
          noShow: ctx.input.noShow,
          chargeAmountInCents: ctx.input.chargeAmountInCents
        });
        break;
      case 'reschedule':
        if (!ctx.input.newStartTime || !ctx.input.newEndTime) {
          throw new Error('newStartTime and newEndTime are required for reschedule action');
        }
        result = await client.rescheduleBooking(
          bookingId,
          ctx.input.newStartTime,
          ctx.input.newEndTime
        );
        break;
      case 'cancel':
        result = await client.cancelBooking(bookingId, siteId, {
          cancellationReason: ctx.input.cancellationReason,
          chargeCancellationFee: ctx.input.chargeCancellationFee
        });
        break;
    }

    return {
      output: { success: result.success },
      message: `Booking **${action}** action completed successfully.`
    };
  })
  .build();
