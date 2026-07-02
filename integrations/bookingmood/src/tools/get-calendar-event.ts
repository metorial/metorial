import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let getCalendarEvent = SlateTool.create(spec, {
  name: 'Get Calendar Event',
  key: 'get_calendar_event',
  description: `Retrieves a single calendar event by its ID, including booking association, product, dates, status, occupancy, and notes.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      eventId: z.string().describe('UUID of the calendar event to retrieve')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('UUID of the calendar event'),
      bookingId: z.string().nullable().describe('UUID of the related booking'),
      productId: z.string().describe('UUID of the product/rental unit'),
      organizationId: z.string().describe('UUID of the organization'),
      calendarId: z.string().nullable().describe('UUID of external calendar'),
      title: z.string().nullable().describe('Event title'),
      generatedTitle: z.string().nullable().describe('Auto-generated title'),
      type: z.string().describe('Event type: booking, blocked period, or note'),
      status: z.string().describe('Event status: CONFIRMED, TENTATIVE, or CANCELLED'),
      startDate: z.string().describe('Start date'),
      endDate: z.string().describe('End date'),
      duration: z.number().nullable().describe('Duration in days'),
      notes: z.string().nullable().describe('Private annotations'),
      occupancy: z.any().nullable().describe('Capacity group usage data'),
      origin: z.string().nullable().describe('Event source'),
      hasNonInvoicedItems: z.boolean().describe('Whether there are non-invoiced items'),
      hasOpenPayments: z.boolean().describe('Whether there are open payments'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    let e = await client.getCalendarEvent(ctx.input.eventId);

    return {
      output: {
        eventId: e.id,
        bookingId: e.booking_id ?? null,
        productId: e.product_id,
        organizationId: e.organization_id,
        calendarId: e.calendar_id ?? null,
        title: e.title ?? null,
        generatedTitle: e.generated_title ?? null,
        type: e.type,
        status: e.status,
        startDate: e.start_date,
        endDate: e.end_date,
        duration: e.duration ?? null,
        notes: e.notes ?? null,
        occupancy: e.occupancy ?? null,
        origin: e.origin ?? null,
        hasNonInvoicedItems: e.has_non_invoiced_items,
        hasOpenPayments: e.has_open_payments,
        createdAt: e.created_at,
        updatedAt: e.updated_at
      },
      message: `Calendar event **${e.generated_title || e.title || e.id}** — status: ${e.status}, type: ${e.type}, dates: ${e.start_date} to ${e.end_date}.`
    };
  })
  .build();
