import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let bookingSchema = z
  .object({
    bookingId: z.number().optional().describe('Booking ID'),
    status: z.string().optional().describe('Booking status'),
    customerName: z.string().optional().describe('Customer name'),
    customerEmail: z.string().optional().describe('Customer email'),
    customerPhone: z.string().optional().describe('Customer phone'),
    productName: z.string().optional().describe('Product name'),
    appointmentName: z.string().optional().describe('Appointment name'),
    orderName: z.string().optional().describe('Order name'),
    startTime: z.string().optional().describe('Booking start time'),
    endTime: z.string().optional().describe('Booking end time'),
    quantity: z.number().optional().describe('Booking quantity')
  })
  .passthrough();

export let listBookings = SlateTool.create(spec, {
  name: 'List Bookings',
  key: 'list_bookings',
  description: `Retrieve bookings from Appointo. Filter by status (past or upcoming), search by product name, customer name, email, phone, or order name. Retrieve a specific booking by ID. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of bookings to return (max 100, default 100)'),
      offset: z.number().optional().describe('Pagination offset'),
      status: z.enum(['past', 'upcoming']).optional().describe('Filter by booking status'),
      bookingId: z.number().optional().describe('Retrieve a specific booking by ID'),
      searchTerm: z
        .string()
        .optional()
        .describe('Search by product name, customer name, email, phone, or order name')
    })
  )
  .output(
    z.object({
      bookings: z.array(bookingSchema).describe('List of bookings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listBookings({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      status: ctx.input.status,
      bookingId: ctx.input.bookingId,
      searchTerm: ctx.input.searchTerm
    });

    let bookings = Array.isArray(result) ? result : (result?.bookings ?? result?.data ?? []);

    let mapped = bookings.map((b: any) => ({
      bookingId: b.id ?? b.booking_id,
      status: b.status,
      customerName: b.customer_name ?? b.name,
      customerEmail: b.customer_email ?? b.email,
      customerPhone: b.customer_phone ?? b.phone,
      productName: b.product_name,
      appointmentName: b.appointment_name,
      orderName: b.order_name,
      startTime: b.start_time ?? b.timestring,
      endTime: b.end_time,
      quantity: b.quantity,
      ...b
    }));

    return {
      output: { bookings: mapped },
      message: `Retrieved **${mapped.length}** booking(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();
