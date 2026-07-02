import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let getBooking = SlateTool.create(spec, {
  name: 'Get Booking',
  key: 'get_booking',
  description: `Retrieves a single booking by its ID with full details including currency, reference, occupancy, confirmation status, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bookingId: z.string().describe('UUID of the booking to retrieve')
    })
  )
  .output(
    z.object({
      bookingId: z.string().describe('UUID of the booking'),
      organizationId: z.string().describe('UUID of the organization'),
      siteId: z.string().nullable().describe('UUID of the associated site'),
      widgetId: z.string().nullable().describe('UUID of the source widget'),
      creatorId: z.string().nullable().describe('UUID of the user who created the booking'),
      reference: z.string().describe('Public-facing booking reference'),
      method: z.string().describe('Creation method: request or book'),
      currency: z.string().describe('Booking currency'),
      displayCurrency: z.string().nullable().describe('Display currency if different'),
      occupancy: z.any().nullable().describe('Per-capacity-group occupancy counts'),
      silent: z.boolean().describe('Whether confirmation email was suppressed'),
      confirmedAt: z.string().nullable().describe('Confirmation timestamp'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    let booking = await client.getBooking(ctx.input.bookingId);

    return {
      output: {
        bookingId: booking.id,
        organizationId: booking.organization_id,
        siteId: booking.site_id ?? null,
        widgetId: booking.widget_id ?? null,
        creatorId: booking.creator_id ?? null,
        reference: booking.reference,
        method: booking.method,
        currency: booking.currency,
        displayCurrency: booking.display_currency ?? null,
        occupancy: booking.occupancy ?? null,
        silent: booking.silent,
        confirmedAt: booking.confirmed_at ?? null,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at
      },
      message: `Retrieved booking **${booking.reference}** (${booking.method}), currency: ${booking.currency}.`
    };
  })
  .build();
