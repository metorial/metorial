import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

let bookingSchema = z.object({
  bookingId: z.string().describe('UUID of the booking'),
  reference: z.string().describe('Public-facing booking reference'),
  method: z.string().describe('Creation method: request or book'),
  currency: z.string().describe('Booking currency'),
  confirmedAt: z.string().nullable().describe('Confirmation timestamp'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listBookings = SlateTool.create(spec, {
  name: 'List Bookings',
  key: 'list_bookings',
  description: `Lists bookings with optional filtering and pagination. Supports PostgREST-style filters (e.g., \`currency=eq.EUR\`). Use **order** for sorting (e.g., \`created_at.desc\`).`,
  constraints: ['Maximum 1000 results per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe('PostgREST-style filters, e.g. { "currency": "eq.EUR" }'),
      order: z.string().optional().describe('Sort order, e.g. "created_at.desc"'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      bookings: z.array(bookingSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    let bookings = await client.listBookings({
      select: 'id,reference,method,currency,confirmed_at,created_at,updated_at',
      filters: ctx.input.filters,
      order: ctx.input.order,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = (bookings || []).map((b: any) => ({
      bookingId: b.id,
      reference: b.reference,
      method: b.method,
      currency: b.currency,
      confirmedAt: b.confirmed_at ?? null,
      createdAt: b.created_at,
      updatedAt: b.updated_at
    }));

    return {
      output: { bookings: mapped },
      message: `Found **${mapped.length}** booking(s).`
    };
  })
  .build();
