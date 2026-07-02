import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let createReservation = SlateTool.create(spec, {
  name: 'Create Reservation',
  key: 'create_reservation',
  description: `Creates a new reservation for a bookable resource. Specify the resource, time period, quantity, and customer details (either by providing an existing user ID or by supplying email and name).
Supports custom form fields, voucher codes, pricing overrides, and shopping cart grouping.`,
  instructions: [
    'Either provide userId for an existing customer, or provide email and firstName for a new/guest booking.',
    'For full-day bookings, set the end time to 23:59 of the last day or the next day without a time component.',
    'Custom reservation form fields can be passed via the customFields object using the field name as the key.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      resourceId: z.string().describe('ID of the resource to book'),
      startTime: z
        .string()
        .describe('Rental start time (e.g. "2024-06-15 10:00" or Unix timestamp)'),
      endTime: z
        .string()
        .describe('Rental end time (e.g. "2024-06-15 14:00" or Unix timestamp)'),
      quantity: z.number().describe('Number of units to reserve'),
      email: z.string().optional().describe('Customer email address'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      userId: z
        .string()
        .optional()
        .describe('Existing Planyo user ID (alternative to email/firstName)'),
      address: z.string().optional().describe('Customer street address'),
      city: z.string().optional().describe('Customer city'),
      zip: z.string().optional().describe('Customer zip/postal code'),
      state: z.string().optional().describe('Customer state/province'),
      country: z.string().optional().describe('Customer country (2-letter ISO code)'),
      phoneNumber: z.string().optional().describe('Customer phone number'),
      mobileNumber: z.string().optional().describe('Customer mobile number'),
      adminMode: z
        .boolean()
        .optional()
        .describe('Bypass form field requirements and constraints'),
      sendNotifications: z
        .boolean()
        .optional()
        .describe('Send email notifications to the customer (default: true)'),
      customPrice: z.string().optional().describe('Override the calculated price'),
      userNotes: z.string().optional().describe('Notes from the customer'),
      adminNotes: z.string().optional().describe('Private admin notes'),
      voucherCode: z.string().optional().describe('Voucher/discount code to apply'),
      cartId: z.string().optional().describe('Shopping cart ID for multi-resource bookings'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom reservation form fields as key-value pairs')
    })
  )
  .output(
    z.object({
      reservationId: z.string().describe('ID of the newly created reservation'),
      shoppingCartId: z.string().optional().describe('Shopping cart ID if applicable'),
      status: z.string().optional().describe('Reservation status'),
      totalPrice: z.number().optional().describe('Total price of the reservation'),
      originalPrice: z.number().optional().describe('Price before discounts'),
      currency: z.string().optional().describe('Currency code'),
      discount: z.number().optional().describe('Applied discount amount'),
      userText: z.string().optional().describe('Status message for the customer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let result = await client.makeReservation({
      resourceId: ctx.input.resourceId,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      quantity: ctx.input.quantity,
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      userId: ctx.input.userId,
      address: ctx.input.address,
      city: ctx.input.city,
      zip: ctx.input.zip,
      state: ctx.input.state,
      country: ctx.input.country,
      phoneNumber: ctx.input.phoneNumber,
      mobileNumber: ctx.input.mobileNumber,
      adminMode: ctx.input.adminMode,
      sendNotifications: ctx.input.sendNotifications,
      customPrice: ctx.input.customPrice,
      userNotes: ctx.input.userNotes,
      adminNotes: ctx.input.adminNotes,
      voucherCode: ctx.input.voucherCode,
      cartId: ctx.input.cartId,
      customFields: ctx.input.customFields
    });

    let reservationId = String(result.reservation_id);

    return {
      output: {
        reservationId,
        shoppingCartId: result.shopping_cart_id ? String(result.shopping_cart_id) : undefined,
        status: result.status ? String(result.status) : undefined,
        totalPrice: result.total_price != null ? Number(result.total_price) : undefined,
        originalPrice:
          result.original_price != null ? Number(result.original_price) : undefined,
        currency: result.currency,
        discount: result.discount != null ? Number(result.discount) : undefined,
        userText: result.user_text
      },
      message: `Reservation **#${reservationId}** created successfully for resource ${ctx.input.resourceId} from ${ctx.input.startTime} to ${ctx.input.endTime}.${result.total_price != null ? ` Total price: ${result.currency || ''} ${result.total_price}` : ''}`
    };
  })
  .build();
