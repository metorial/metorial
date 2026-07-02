import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let bookingSchema = z
  .object({
    bookingId: z.string().describe('Headout booking identifier'),
    partnerReferenceId: z.string().optional().describe('Partner reference ID'),
    variantId: z.string().optional(),
    inventoryId: z.string().optional(),
    startDateTime: z.string().optional().describe('Experience start time'),
    productName: z.string().optional(),
    productId: z.string().optional(),
    variantName: z.string().optional(),
    customerCount: z.number().optional().describe('Number of customers'),
    customers: z
      .array(
        z.object({
          personType: z.string().optional(),
          isPrimary: z.boolean().optional(),
          inputFields: z
            .array(
              z.object({
                fieldId: z.string().optional(),
                name: z.string().optional(),
                value: z.string().optional()
              })
            )
            .optional()
        })
      )
      .optional()
      .describe('Customer details'),
    priceAmount: z.number().optional(),
    priceCurrencyCode: z.string().optional(),
    status: z
      .string()
      .describe(
        'Booking status (UNCAPTURED, PENDING, COMPLETED, CANCELLED, DIRTY, CAPTURE_TIMEDOUT)'
      ),
    voucherUrl: z.string().optional().describe('URL to the booking voucher'),
    tickets: z
      .array(
        z.object({
          publicId: z.string().optional(),
          url: z.string().optional()
        })
      )
      .optional()
      .describe('Ticket PDF links'),
    creationTimestamp: z.number().optional().describe('Creation time as epoch milliseconds')
  })
  .passthrough();

export let getBooking = SlateTool.create(spec, {
  name: 'Get Booking',
  key: 'get_booking',
  description: `Retrieve details of a specific booking by its ID, or list all bookings with pagination.
Returns booking status, customer details, voucher URL, and ticket links.`,
  instructions: [
    'Provide a bookingId to get a specific booking, or omit it to list all bookings.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bookingId: z
        .string()
        .optional()
        .describe('Specific booking ID to retrieve. Omit to list all bookings.'),
      offset: z.number().optional().describe('Pagination offset (only for listing)'),
      limit: z.number().optional().describe('Results per page (only for listing)')
    })
  )
  .output(
    z.object({
      bookings: z
        .array(bookingSchema)
        .describe('List of bookings (one item if querying by ID)'),
      total: z.number().optional().describe('Total number of bookings (only for listing)'),
      nextOffset: z.number().optional().describe('Offset for the next page (only for listing)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      languageCode: ctx.config.languageCode,
      currencyCode: ctx.config.currencyCode
    });

    let mapBooking = (b: any) => ({
      bookingId: String(b.bookingId ?? b.id ?? ''),
      partnerReferenceId: b.partnerReferenceId,
      variantId: b.variantId ? String(b.variantId) : undefined,
      inventoryId: b.inventoryId ? String(b.inventoryId) : undefined,
      startDateTime: b.startDateTime,
      productName: b.product?.name,
      productId: b.product?.id ? String(b.product.id) : undefined,
      variantName: b.product?.variant?.name,
      customerCount: b.customerDetails?.count ?? b.customersDetails?.count,
      customers: (b.customerDetails?.customers ?? b.customersDetails?.customers)?.map(
        (c: any) => ({
          personType: c.personType,
          isPrimary: c.isPrimary,
          inputFields: c.inputFields?.map((f: any) => ({
            fieldId: String(f.id ?? f.fieldId ?? ''),
            name: f.name,
            value: f.value
          }))
        })
      ),
      priceAmount: b.price?.amount,
      priceCurrencyCode: b.price?.currencyCode,
      status: b.status ?? 'UNKNOWN',
      voucherUrl: b.voucherUrl,
      tickets: b.tickets,
      creationTimestamp: b.creationTimestamp
    });

    if (ctx.input.bookingId) {
      let booking = await client.getBooking(ctx.input.bookingId);
      let mapped = mapBooking(booking);
      return {
        output: {
          bookings: [mapped],
          total: 1
        },
        message: `Booking **${mapped.bookingId}** — status: **${mapped.status}**${mapped.productName ? `, product: "${mapped.productName}"` : ''}.`
      };
    }

    let result = await client.listBookings({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let bookings = (result.items ?? []).map(mapBooking);

    return {
      output: {
        bookings,
        total: result.total,
        nextOffset: result.nextOffset
      },
      message: `Found ${result.total ?? bookings.length} bookings. Showing ${bookings.length} results.`
    };
  })
  .build();
