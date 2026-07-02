import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

let calendarEventSchema = z.object({
  eventId: z.string().describe('UUID of the calendar event'),
  bookingId: z.string().nullable().describe('UUID of the related booking'),
  productId: z.string().describe('UUID of the product/rental unit'),
  title: z.string().nullable().describe('Event title'),
  type: z.string().describe('Event type: booking, blocked period, or note'),
  status: z.string().describe('Event status: CONFIRMED, TENTATIVE, or CANCELLED'),
  startDate: z.string().describe('Start date'),
  endDate: z.string().describe('End date'),
  duration: z.number().nullable().describe('Duration in days'),
  notes: z.string().nullable().describe('Private annotations'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listCalendarEvents = SlateTool.create(spec, {
  name: 'List Calendar Events',
  key: 'list_calendar_events',
  description: `Lists calendar events (bookings, blocked periods, notes) with optional filtering and pagination. Filter by product, status, date range, or type using PostgREST-style filters.`,
  instructions: [
    'Use filters like `{ "product_id": "eq.<uuid>", "status": "eq.CONFIRMED" }` to narrow results.',
    'For date ranges, use `{ "start_date": "gte.2024-01-01", "end_date": "lte.2024-12-31" }`.'
  ],
  constraints: ['Maximum 1000 results per request.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      filters: z.record(z.string(), z.string()).optional().describe('PostgREST-style filters'),
      order: z.string().optional().describe('Sort order, e.g. "start_date.asc"'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      events: z.array(calendarEventSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    let events = await client.listCalendarEvents({
      select:
        'id,booking_id,product_id,title,type,status,start_date,end_date,duration,notes,created_at,updated_at',
      filters: ctx.input.filters,
      order: ctx.input.order,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = (events || []).map((e: any) => ({
      eventId: e.id,
      bookingId: e.booking_id ?? null,
      productId: e.product_id,
      title: e.title ?? null,
      type: e.type,
      status: e.status,
      startDate: e.start_date,
      endDate: e.end_date,
      duration: e.duration ?? null,
      notes: e.notes ?? null,
      createdAt: e.created_at,
      updatedAt: e.updated_at
    }));

    return {
      output: { events: mapped },
      message: `Found **${mapped.length}** calendar event(s).`
    };
  })
  .build();
