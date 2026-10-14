import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let bookingSchema = z
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

export let mapBooking = (booking: Record<string, any>) => {
  let customer = booking.customers?.[0];
  return {
    ...booking,
    bookingId: booking.id ?? booking.booking_id,
    status: booking.status ?? undefined,
    customerName: booking.customer_name ?? booking.name ?? customer?.name ?? undefined,
    customerEmail: booking.customer_email ?? booking.email ?? customer?.email ?? undefined,
    customerPhone:
      booking.customer_phone ?? booking.phone ?? customer?.payload?.phone ?? undefined,
    productName: booking.product_name ?? undefined,
    appointmentName: booking.appointment_name ?? booking.appointment?.name ?? undefined,
    orderName: booking.order_name ?? undefined,
    startTime: booking.start_time ?? booking.selected_time ?? booking.timestring ?? undefined,
    endTime: booking.end_time ?? booking.end_date ?? undefined,
    quantity: booking.quantity ?? undefined
  };
};

export let getAppointoRecord = (
  result: any,
  resource: 'booking' | 'appointment'
): Record<string, any> => {
  let value = result?.response?.[resource] ?? result?.[resource] ?? result?.data ?? result;
  let record = Array.isArray(value) ? value[0] : value;
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw createApiServiceError(`Appointo returned no ${resource} details.`, {
      reason: 'appointo_response'
    });
  }
  return record;
};
