import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
Set **captureImmediately** to true to automatically capture after creation, or set it to false to handle capture separately.`,
  instructions: [
    'First use "Get Product Details" to find variant IDs and required input fields.',
    'Then use "Get Inventory & Pricing" to find available inventoryId and confirm pricing.',
    'The primary customer must have email, full name, and phone number in their inputFields.',
    'Bookings can fail if inventory has become stale between fetching and booking.'
  ],
  constraints: [
    'Cancellations are not supported via API — contact Headout support.',
    'Production API key bookings are treated as real, billable bookings.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
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
  .output(
    z.object({
      bookingId: z.string().describe('Headout booking identifier'),
      partnerReferenceId: z.string().optional().describe('Partner reference ID'),
      status: z
        .string()
        .describe('Booking status (UNCAPTURED, PENDING, COMPLETED, CANCELLED)'),
      variantId: z.string().optional(),
      inventoryId: z.string().optional(),
      startDateTime: z.string().optional().describe('Experience start time'),
      productName: z.string().optional(),
      variantName: z.string().optional(),
      priceAmount: z.number().optional(),
      priceCurrencyCode: z.string().optional(),
      voucherUrl: z.string().optional().describe('URL to the booking voucher'),
      tickets: z
        .array(
          z.object({
            publicId: z.string().optional(),
            url: z.string().optional()
          })
        )
        .optional()
        .describe('Ticket PDF links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      languageCode: ctx.config.languageCode,
      currencyCode: ctx.config.currencyCode
    });

    let bookingBody: any = {
      variantId: ctx.input.variantId,
      inventoryId: ctx.input.inventoryId,
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

    if (ctx.input.variantInputFields) {
      bookingBody.variantInputFields = ctx.input.variantInputFields.map(f => ({
        id: f.fieldId,
        value: f.value
      }));
    }

    if (ctx.input.priceAmount !== undefined && ctx.input.priceCurrencyCode) {
      bookingBody.price = {
        amount: ctx.input.priceAmount,
        currencyCode: ctx.input.priceCurrencyCode
      };
    }

    ctx.progress('Creating booking (step 1: UNCAPTURED)...');
    let booking = await client.createBooking(bookingBody);

    let bookingId = String(booking.bookingId ?? booking.itineraryId ?? booking.id ?? '');
    let status = booking.status ?? 'UNCAPTURED';

    let captureImmediately = ctx.input.captureImmediately !== false;

    if (captureImmediately && bookingId) {
      ctx.progress('Capturing booking (step 2: confirming charge)...');
      let captured = await client.captureBooking(bookingId, {
        partnerReferenceId: ctx.input.partnerReferenceId
      });
      booking = { ...booking, ...captured };
      status = captured.status ?? 'PENDING';
    }

    let output = {
      bookingId,
      partnerReferenceId: booking.partnerReferenceId ?? ctx.input.partnerReferenceId,
      status,
      variantId: booking.variantId ?? ctx.input.variantId,
      inventoryId: booking.inventoryId ?? ctx.input.inventoryId,
      startDateTime: booking.startDateTime,
      productName: booking.product?.name,
      variantName: booking.product?.variant?.name,
      priceAmount: booking.price?.amount,
      priceCurrencyCode: booking.price?.currencyCode,
      voucherUrl: booking.voucherUrl,
      tickets: booking.tickets
    };

    return {
      output,
      message: `Booking **${bookingId}** created with status **${status}**${output.productName ? ` for "${output.productName}"` : ''}.${output.voucherUrl ? ` [View voucher](${output.voucherUrl})` : ''}`
    };
  })
  .build();
