import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { bookingSchema, mapBooking } from '../lib/booking';
import { Client } from '../lib/client';
import { requireHeadoutId } from '../lib/response';
import { spec } from '../spec';

let customerInputFieldSchema = z.object({
  fieldId: z.string().describe('Input field ID from the product variant'),
  value: z.string().describe('Value for the input field')
});

let customerSchema = z.object({
  personType: z
    .string()
    .optional()
    .describe('Person type (e.g., ADULT, CHILD) — required for PER_PERSON pricing'),
  isPrimary: z
    .boolean()
    .optional()
    .describe('Whether this is the primary customer (first customer should be true)'),
  inputFields: z
    .array(customerInputFieldSchema)
    .describe('Customer-specific input fields (e.g., name, email, phone)')
});

export let createBooking = SlateTool.create(spec, {
  name: 'Create Booking',
  key: 'create_booking',
  description: `Create a new booking on Headout using a two-step flow. Step 1 creates the booking in UNCAPTURED state to confirm availability. Step 2 captures the booking to confirm the charge.
Set **captureImmediately** to true to automatically capture after creation, or set it to false and later use capture_booking to start fulfillment.`,
  instructions: [
    'First use "Get Product Details" to find variant IDs and required input fields.',
    'Then use "Get Inventory & Pricing" to find available inventoryId and confirm pricing.',
    'Always include priceAmount and priceCurrencyCode from the selected inventory pricing, as recommended by Headout.',
    'The primary customer must have email, full name, and phone number in their inputFields.',
    'Bookings can fail if inventory has become stale between fetching and booking.'
  ],
  constraints: [
    'Capture within one hour of creation. Use cancel_booking to submit a cancellation request subject to the booking policy.',
    'Production API key bookings are treated as real, billable bookings.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      productId: z
        .string()
        .optional()
        .describe('Parent product ID from get_product. Include this when creating a booking.'),
      variantId: z.string().describe('Product variant ID to book'),
      inventoryId: z.string().describe('Inventory slot ID from the inventory lookup'),
      customers: z
        .array(customerSchema)
        .describe('Customer details. First customer should have isPrimary: true.'),
      variantInputFields: z
        .array(customerInputFieldSchema)
        .optional()
        .describe('Variant-level input fields (if required by the product)'),
      priceAmount: z.number().optional().describe('Expected total price amount'),
      priceCurrencyCode: z
        .string()
        .optional()
        .describe('Currency code for the price (ISO 4217)'),
      captureImmediately: z
        .boolean()
        .optional()
        .describe('If true, automatically capture the booking after creation (default: true)'),
      partnerReferenceId: z
        .string()
        .optional()
        .describe('Your own reference ID for this booking')
    })
  )
  .output(bookingSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      languageCode: ctx.config.languageCode,
      currencyCode: ctx.config.currencyCode
    });

    if (ctx.input.customers.length === 0) {
      throw createApiServiceError('At least one customer is required to create a booking.');
    }
    let priceCurrencyCode = ctx.input.priceCurrencyCode ?? ctx.config.currencyCode;
    if (
      (ctx.input.priceAmount !== undefined && !priceCurrencyCode) ||
      (ctx.input.priceAmount === undefined && ctx.input.priceCurrencyCode !== undefined)
    ) {
      throw createApiServiceError(
        'Provide priceAmount and priceCurrencyCode together, or configure a default currency when providing priceAmount.'
      );
    }

    let bookingBody: Parameters<Client['createBooking']>[0] = {
      productId: ctx.input.productId,
      partnerReferenceId: ctx.input.partnerReferenceId,
      variantId: ctx.input.variantId,
      inventoryId: ctx.input.inventoryId,
      variantInputFields: ctx.input.variantInputFields?.map(f => ({
        id: f.fieldId,
        value: f.value
      })),
      price:
        ctx.input.priceAmount !== undefined && priceCurrencyCode
          ? { amount: ctx.input.priceAmount, currencyCode: priceCurrencyCode }
          : undefined,
      customersDetails: {
        count: ctx.input.customers.length,
        customers: ctx.input.customers.map(c => ({
          personType: c.personType,
          isPrimary: c.isPrimary,
          inputFields: c.inputFields.map(f => ({
            id: f.fieldId,
            value: f.value
          }))
        }))
      }
    };

    ctx.progress('Creating booking (step 1: UNCAPTURED)...');
    let booking = await client.createBooking(bookingBody);

    let providerBookingId = booking?.bookingId ?? booking?.itineraryId ?? booking?.id;
    if (providerBookingId == null || providerBookingId === '') {
      throw createApiServiceError(
        'Headout did not return a booking ID. Use get_booking to check existing bookings before retrying creation.'
      );
    }
    let bookingId = requireHeadoutId(providerBookingId, 'booking ID');
    let status = booking.status ?? 'UNCAPTURED';

    let captureImmediately = ctx.input.captureImmediately !== false;

    if (captureImmediately && bookingId) {
      ctx.progress('Capturing booking (step 2: confirming charge)...');
      try {
        let captured = await client.captureBooking(bookingId, {
          partnerReferenceId: ctx.input.partnerReferenceId
        });
        booking = { ...booking, ...captured };
        status = captured.status ?? 'PENDING';
      } catch (error) {
        throw createApiServiceError(
          `Booking ${bookingId} was created, but capture could not be confirmed. Check get_booking and use capture_booking for this ID rather than creating another booking.`,
          {
            reason: 'headout_capture_unconfirmed',
            parent: error
          }
        );
      }
    }

    let output = mapBooking({
      ...booking,
      bookingId,
      status,
      variantId: booking.variantId ?? ctx.input.variantId,
      inventoryId: booking.inventoryId ?? ctx.input.inventoryId,
      partnerReferenceId: booking.partnerReferenceId ?? ctx.input.partnerReferenceId
    });
    for (let ticket of booking.tickets ?? []) {
      if (ticket.type === 'PDF_URL' && ticket.url) {
        await ctx.addAttachment({ type: 'url', url: ticket.url, mimeType: 'application/pdf' });
      }
    }

    return {
      output,
      message: `Booking **${bookingId}** created with status **${status}**${output.productName ? ` for "${output.productName}"` : ''}.${output.voucherUrl ? ` [View voucher](${output.voucherUrl})` : ''}`
    };
  })
  .build();
