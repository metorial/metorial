import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let updateCalendarEvent = SlateTool.create(spec, {
  name: 'Update Calendar Event',
  key: 'update_calendar_event',
  description: `Updates a calendar event. Use this to change status (confirm/cancel), modify dates, update notes, or change the title of bookings and blocked periods.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      eventId: z.string().describe('UUID of the calendar event to update'),
      title: z.string().optional().describe('New event title'),
      status: z
        .enum(['CONFIRMED', 'TENTATIVE', 'CANCELLED'])
        .optional()
        .describe('New event status'),
      startDate: z.string().optional().describe('New start date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('New end date (YYYY-MM-DD)'),
      notes: z.string().optional().describe('Private annotations')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('UUID of the updated event'),
      status: z.string().describe('Updated status'),
      startDate: z.string().describe('Updated start date'),
      endDate: z.string().describe('Updated end date'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);

    let patchData: Record<string, any> = {};
    if (ctx.input.title !== undefined) patchData.title = ctx.input.title;
    if (ctx.input.status !== undefined) patchData.status = ctx.input.status;
    if (ctx.input.startDate !== undefined) patchData.start_date = ctx.input.startDate;
    if (ctx.input.endDate !== undefined) patchData.end_date = ctx.input.endDate;
    if (ctx.input.notes !== undefined) patchData.notes = ctx.input.notes;

    let result = await client.updateCalendarEvent(ctx.input.eventId, patchData);

    return {
      output: {
        eventId: result.id,
        status: result.status,
        startDate: result.start_date,
        endDate: result.end_date,
        updatedAt: result.updated_at
      },
      message: `Calendar event **${result.id}** updated — status: ${result.status}.`
    };
  })
  .build();
