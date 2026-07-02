import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createBooking = SlateTool.create(spec, {
  name: 'Create Booking',
  key: 'create_booking',
  description: `Create a new booking in Appointo. Requires an appointment ID, timeslot, and customer details (name and email). Optionally specify quantity for group bookings.`,
  constraints: ['Write operations are limited to 100 requests per day.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      appointmentId: z.number().describe('ID of the appointment to book'),
      timestring: z
        .string()
        .describe(
          'Desired timeslot in ISO 8601 datetime format (e.g., "2024-12-15T10:00:00Z")'
        ),
      name: z.string().describe('Customer name'),
      email: z.string().describe('Customer email address'),
      phone: z.string().optional().describe('Customer phone number'),
      quantity: z
        .number()
        .min(1)
        .optional()
        .describe('Number of spots to book (for group bookings, default: 1)')
    })
  )
  .output(
    z
      .object({
        bookingId: z.number().optional().describe('ID of the created booking'),
        status: z.string().optional().describe('Booking status'),
        customerName: z.string().optional().describe('Customer name'),
        customerEmail: z.string().optional().describe('Customer email'),
        startTime: z.string().optional().describe('Booking start time')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createBooking({
      appointmentId: ctx.input.appointmentId,
      timestring: ctx.input.timestring,
      name: ctx.input.name,
      email: ctx.input.email,
      phone: ctx.input.phone,
      quantity: ctx.input.quantity
    });

    let booking = result?.booking ?? result?.data ?? result;

    let output = {
      bookingId: booking?.id ?? booking?.booking_id,
      status: booking?.status,
      customerName: booking?.customer_name ?? booking?.name,
      customerEmail: booking?.customer_email ?? booking?.email,
      startTime: booking?.start_time ?? booking?.timestring,
      ...booking
    };

    return {
      output,
      message: `Booking created for **${ctx.input.name}** (${ctx.input.email}) at ${ctx.input.timestring}.`
    };
  })
  .build();
