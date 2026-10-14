import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let searchAvailability = SlateTool.create(spec, {
  name: 'Search Availability',
  key: 'search_availability',
  description:
    'Checks rental-unit availability for a date range, occupancy, or attribute options. Call list_products to discover product IDs and list_capacity_groups to discover occupancy group IDs before creating a booking.',
  instructions: [
    'Provide both startDate and endDate to check dates. Without dates, the search checks only occupancy and attribute options.',
    'Check match and availability in each result before calling create_booking. A search does not reserve a unit.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      startDate: z
        .string()
        .optional()
        .describe('Start date in YYYY-MM-DD format; requires endDate'),
      endDate: z
        .string()
        .optional()
        .describe('End date in YYYY-MM-DD format; requires startDate'),
      productIds: z
        .array(z.string())
        .optional()
        .describe('Product IDs from list_products; omit to search authorized products'),
      occupancy: z
        .record(z.string(), z.number().int().nonnegative())
        .optional()
        .describe('Guest counts keyed by capacity group IDs from list_capacity_groups'),
      optionIds: z.array(z.string()).optional().describe('Attribute option IDs to match'),
      showBookedAs: z
        .enum(['booked', 'unavailable'])
        .optional()
        .describe('How to interpret confirmed bookings; defaults to unavailable'),
      showClosedAs: z
        .enum(['closed', 'unavailable'])
        .optional()
        .describe('How to interpret closed periods; defaults to unavailable'),
      showPendingAs: z
        .enum(['CANCELLED', 'TENTATIVE', 'CONFIRMED'])
        .optional()
        .describe('How to interpret pending events; defaults to TENTATIVE')
    })
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          productId: z.string().describe('Product ID for get_product or create_booking'),
          match: z.boolean().describe('Whether all search criteria match'),
          occupancyMatches: z.boolean().describe('Whether the occupancy criteria match'),
          optionsMatch: z.boolean().describe('Whether the attribute options match'),
          availability: z.string().describe('Availability status reported by Bookingmood'),
          price: z
            .object({ min: z.number(), max: z.number() })
            .nullable()
            .describe('Price range when available')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    if ((ctx.input.startDate === undefined) !== (ctx.input.endDate === undefined)) {
      throw createApiServiceError('Provide both startDate and endDate, or omit both.');
    }
    let client = new BookingmoodClient(ctx.auth.token);
    let results = await client.searchAvailability({
      interval:
        ctx.input.startDate !== undefined && ctx.input.endDate !== undefined
          ? { start: ctx.input.startDate, end: ctx.input.endDate }
          : undefined,
      occupancy: ctx.input.occupancy,
      productIds: ctx.input.productIds,
      optionIds: ctx.input.optionIds,
      showBookedAs: ctx.input.showBookedAs,
      showClosedAs: ctx.input.showClosedAs,
      showPendingAs: ctx.input.showPendingAs
    });
    return {
      output: { results },
      message: `Found **${results.filter(result => result.match).length}** matching product(s) across **${results.length}** search result(s).`
    };
  })
  .build();
