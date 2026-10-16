import { z } from 'zod';
import { requireHeadoutId } from './response';

export let bookingSchema = z
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
        'Booking status (UNCAPTURED, PENDING, COMPLETED, CANCELLED, FAILED, DIRTY, CAPTURE_TIMEOUT, CAPTURE_TIMEDOUT)'
      ),
    voucherUrl: z.string().optional().describe('URL to the booking voucher'),
    tickets: z
      .array(
        z.object({
          publicId: z.string().optional(),
          url: z.string().optional(),
          type: z.string().optional()
        })
      )
      .optional()
      .describe('Ticket URLs and ticket type, when available'),
    creationTimestamp: z.number().optional().describe('Creation time as Unix epoch seconds'),
    raw: z.unknown().optional().describe('Complete booking response from Headout')
  })
  .passthrough();

export let mapBooking = (b: any) => ({
  ...b,
  raw: b,
  bookingId: requireHeadoutId(b?.bookingId ?? b?.itineraryId ?? b?.id, 'booking ID'),
  partnerReferenceId: b.partnerReferenceId ?? undefined,
  variantId: b.variantId != null ? requireHeadoutId(b.variantId, 'variant ID') : undefined,
  inventoryId:
    b.inventoryId != null ? requireHeadoutId(b.inventoryId, 'inventory ID') : undefined,
  startDateTime: b.startDateTime ?? undefined,
  productName: b.product?.name ?? undefined,
  productId: b.product?.id != null ? requireHeadoutId(b.product.id, 'product ID') : undefined,
  variantName: b.product?.variant?.name ?? undefined,
  customerCount: b.customerDetails?.count ?? b.customersDetails?.count,
  customers: (b.customerDetails?.customers ?? b.customersDetails?.customers)?.map(
    (c: any) => ({
      ...c,
      personType: c.personType ?? undefined,
      isPrimary: c.isPrimary ?? undefined,
      inputFields: c.inputFields?.map((f: any) => ({
        ...f,
        fieldId:
          f.id != null || f.fieldId != null
            ? requireHeadoutId(f.id ?? f.fieldId, 'customer field ID')
            : undefined,
        name: f.name ?? undefined,
        value: f.value ?? undefined
      }))
    })
  ),
  priceAmount: b.price?.amount ?? undefined,
  priceCurrencyCode: b.price?.currencyCode ?? undefined,
  status: b.status ?? 'UNKNOWN',
  voucherUrl: b.voucherUrl ?? undefined,
  tickets: b.tickets?.map((ticket: any) => ({
    ...ticket,
    publicId: ticket.publicId ?? undefined,
    url: ticket.url ?? undefined,
    type: ticket.type ?? undefined
  })),
  creationTimestamp: b.creationTimestamp ?? undefined
});
