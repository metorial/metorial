import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { type BatchReservationRef, Client } from '../lib/client';
import { spec } from '../spec';

export let manageReplyStatus = SlateTool.create(spec, {
  name: 'Manage Reply Status',
  key: 'manage_reply_status',
  description: `Mark bookings and enquiries as replied or not replied. Reply state is the inbox flag that drives follow-up workflows, so clearing it brings an item back onto the list of things needing a response. Update a single booking, or several bookings and enquiries at once.`,
  instructions: [
    'Set bookingId to update one booking. Set reservations to update several items, or to update an enquiry, which the single-booking mode does not support.',
    'Use list_inbox to find items needing attention and to read the type of each item, which the batch mode requires.'
  ],
  constraints: [
    'Provide either bookingId or reservations, never both.',
    'A batch update is confirmed as a whole and reports no per-item result, so an individual item cannot be verified from the response. Re-read the items to confirm their reply state.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['mark_replied', 'mark_not_replied'])
        .describe(
          'Whether to mark the targets as replied, or as not replied so they reappear as needing a response'
        ),
      bookingId: z
        .number()
        .optional()
        .describe(
          'Single-booking mode: the ID of one booking to update. Cannot be combined with reservations, and does not accept enquiries'
        ),
      reservations: z
        .array(
          z.object({
            id: z.number().describe('ID of the booking or enquiry to update'),
            type: z
              .string()
              .describe(
                'Kind of item this ID refers to, either "Booking" or "Enquiry". Required because the two kinds number their IDs separately'
              )
          })
        )
        .optional()
        .describe(
          'Batch mode: the bookings and enquiries to update together. Cannot be combined with bookingId, and must contain at least one entry'
        )
    })
  )
  .output(
    z.object({
      success: z
        .boolean()
        .describe(
          'Whether the request was accepted. For a batch this covers the request as a whole, since no per-item result is reported'
        ),
      action: z
        .enum(['mark_replied', 'mark_not_replied'])
        .describe('The reply state that was applied'),
      mode: z
        .enum(['single', 'batch'])
        .describe('Whether one booking or a batch of items was updated'),
      targetIds: z
        .array(z.number())
        .describe(
          'IDs included in the request. In batch mode these were submitted together and are not individually confirmed'
        ),
      targetCount: z.number().describe('Number of items included in the request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let batch = ctx.input.reservations ?? [];
    let hasSingle = ctx.input.bookingId !== undefined;
    let status: 'replied' | 'not_replied' =
      ctx.input.action === 'mark_replied' ? 'replied' : 'not_replied';
    let stateText = ctx.input.action === 'mark_replied' ? 'replied' : 'not replied';

    if (hasSingle && batch.length > 0) {
      throw createApiServiceError(
        'Provide either bookingId for a single booking or reservations for a batch update, not both.'
      );
    }

    if (!hasSingle && batch.length === 0) {
      throw createApiServiceError(
        'Provide bookingId to update one booking, or reservations with at least one entry to update bookings and enquiries together.'
      );
    }

    if (hasSingle) {
      let bookingId = ctx.input.bookingId as number;
      await client.setBookingRepliedStatus(bookingId, status);

      return {
        output: {
          success: true,
          action: ctx.input.action,
          mode: 'single' as const,
          targetIds: [bookingId],
          targetCount: 1
        },
        message: `Marked booking **#${bookingId}** as **${stateText}**.`
      };
    }

    let reservations: BatchReservationRef[] = batch.map(item => ({
      id: item.id,
      type: item.type
    }));

    await client.batchSetRepliedStatus(status, reservations);

    return {
      output: {
        success: true,
        action: ctx.input.action,
        mode: 'batch' as const,
        targetIds: reservations.map(item => item.id),
        targetCount: reservations.length
      },
      message: `Submitted **${reservations.length}** items to be marked as **${stateText}**. The request is confirmed as a whole, without a per-item result.`
    };
  })
  .build();
