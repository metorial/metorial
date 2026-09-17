import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let maxInboxLimit = 50;
let defaultInboxLimit = 10;

let inboxItem = z.looseObject({
  id: z.number().optional().describe('Identifier of the booking or enquiry'),
  type: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Whether this item is a Booking or an Enquiry. Determines which follow-up tools apply: bookings support status changes, quotes, and payment requests, while enquiries must first be upgraded to a booking'
    ),
  booking_type: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Bookability of the item, such as InstantBooking, BookingRequest, or EnquiryOnly'
    ),
  status: z
    .string()
    .nullable()
    .optional()
    .describe('Current status, such as Open, Booked, Declined, or Tentative'),
  source: z.string().nullable().optional().describe('Channel the item arrived from'),
  source_text: z
    .string()
    .nullable()
    .optional()
    .describe('Free-text description of the source'),
  guest: z
    .any()
    .optional()
    .describe('Guest details including name, email, phone numbers, and address'),
  arrival: z.string().nullable().optional().describe('Arrival date (YYYY-MM-DD)'),
  departure: z.string().nullable().optional().describe('Departure date (YYYY-MM-DD)'),
  total_guest_breakdown: z
    .any()
    .optional()
    .describe('Guest counts split into adults, children, infants, and pets'),
  property_id: z.number().nullable().optional().describe('Identifier of the property'),
  property_name: z.string().nullable().optional().describe('Name of the property'),
  rooms: z
    .any()
    .optional()
    .describe('Rooms attached to the item, including room type IDs and key codes'),
  created_at: z.string().nullable().optional().describe('When the item was created'),
  updated_at: z.string().nullable().optional().describe('When the item was last updated'),
  is_replied: z
    .boolean()
    .optional()
    .describe('Whether the item is marked as replied, which drives follow-up workflows'),
  is_deleted: z
    .boolean()
    .optional()
    .describe('Whether the item is in the trash and recoverable'),
  date_deleted: z
    .string()
    .nullable()
    .optional()
    .describe('When the item was moved to the trash, if it was'),
  total_amount: z.number().nullable().optional().describe('Total amount for the stay'),
  total_paid: z.number().nullable().optional().describe('Amount already paid'),
  amount_to_pay: z.number().nullable().optional().describe('Amount still outstanding'),
  thread_uid: z
    .string()
    .nullable()
    .optional()
    .describe('Identifier of the message thread this item belongs to'),
  upgraded_enquiry_id: z
    .number()
    .nullable()
    .optional()
    .describe('Identifier of the original enquiry, when the booking was upgraded from one'),
  currency: z
    .any()
    .optional()
    .describe('Currency of the amounts, including code, name, and symbol')
});

export let listInbox = SlateTool.create(spec, {
  name: 'List Inbox',
  key: 'list_inbox',
  description: `List bookings and enquiries together from the inbox, the only view that returns both kinds of item in one call. Supports filtering by status, property, stay date range, last-modified time, and trash state. Each item reports whether it is a booking or an enquiry, plus its reply state, so you can decide which follow-up action applies.`,
  instructions: [
    'Use this tool when you need bookings and enquiries in one view, or when you need to find enquiries at all. Use list_bookings instead when you only need bookings and want transaction or quote details.',
    'Each item carries a type field identifying it as a Booking or an Enquiry; check it before choosing a follow-up tool.',
    'Page through large result sets by increasing offset by the page size rather than raising limit.'
  ],
  constraints: [
    `At most ${maxInboxLimit} items can be returned per page, and Lodgify returns ${defaultInboxLimit} when no page size is given.`,
    'Trash state is a single on/off filter here, so trashed and untrashed items cannot be combined into one result set.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z
        .number()
        .optional()
        .describe(
          'Number of items to skip before collecting results, used for pagination (defaults to 0)'
        ),
      limit: z
        .number()
        .min(1)
        .max(maxInboxLimit)
        .optional()
        .describe(
          `Maximum number of items to return per page, from 1 to ${maxInboxLimit} (defaults to ${defaultInboxLimit})`
        ),
      status: z
        .string()
        .optional()
        .describe(
          'Return only items with this status, such as "Open", "Booked", "Declined", or "Tentative". Accepts any status text the account uses'
        ),
      trash: z
        .boolean()
        .optional()
        .describe(
          'Filter by trash state: false (the default) returns items that are not in the trash, true returns trashed items. There is no combined option, so run two calls to see both'
        ),
      propertyId: z
        .number()
        .optional()
        .describe('Return only items associated with this property ID'),
      periodStart: z
        .string()
        .optional()
        .describe('Return only items starting from this date (YYYY-MM-DD or ISO datetime)'),
      periodEnd: z
        .string()
        .optional()
        .describe('Return only items ending before this date (YYYY-MM-DD or ISO datetime)'),
      modifiedSince: z
        .string()
        .optional()
        .describe('Return only items modified after this date and time (ISO datetime)')
    })
  )
  .output(
    z.object({
      items: z
        .array(inboxItem)
        .describe('Bookings and enquiries on this page, newest activity first'),
      total: z
        .number()
        .optional()
        .describe('Total number of items matching the filters across all pages'),
      returned: z.number().describe('Number of items returned on this page'),
      offset: z.number().describe('Offset that produced this page'),
      limit: z.number().describe('Page size used for this request'),
      hasMore: z.boolean().describe('Whether more pages remain after this one'),
      nextOffset: z
        .number()
        .nullable()
        .describe('Offset to request the next page, or null when this is the last page'),
      bookingCount: z.number().describe('Number of bookings on this page'),
      enquiryCount: z.number().describe('Number of enquiries on this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (
      ctx.input.limit !== undefined &&
      (ctx.input.limit < 1 || ctx.input.limit > maxInboxLimit)
    ) {
      throw createApiServiceError(
        `limit must be between 1 and ${maxInboxLimit}. To read more than ${maxInboxLimit} items, request ${maxInboxLimit} at a time and increase offset by ${maxInboxLimit} on each call.`
      );
    }

    let result = await client.listInbox({
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      status: ctx.input.status,
      trash: ctx.input.trash,
      propertyId: ctx.input.propertyId,
      periodStart: ctx.input.periodStart,
      periodEnd: ctx.input.periodEnd,
      modifiedSince: ctx.input.modifiedSince
    });

    let items = Array.isArray(result?.items) ? result.items : [];
    let total = typeof result?.total === 'number' ? result.total : undefined;
    let offset = ctx.input.offset ?? 0;
    let limit = ctx.input.limit ?? defaultInboxLimit;
    let hasMore = total !== undefined ? offset + items.length < total : Boolean(result?.next);

    let enquiryCount = items.filter(
      (item: any) => String(item?.type ?? '').toLowerCase() === 'enquiry'
    ).length;
    let bookingCount = items.length - enquiryCount;

    let totalText = total !== undefined ? ` of **${total}** total` : '';
    let moreText = hasMore ? ' More pages are available.' : '';

    return {
      output: {
        items,
        total,
        returned: items.length,
        offset,
        limit,
        hasMore,
        nextOffset: hasMore ? offset + items.length : null,
        bookingCount,
        enquiryCount
      },
      message: `Retrieved **${items.length}** inbox items${totalText} (**${bookingCount}** bookings, **${enquiryCount}** enquiries).${moreText}`
    };
  })
  .build();
