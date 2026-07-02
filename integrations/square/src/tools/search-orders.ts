import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let moneySchema = z
  .object({
    amount: z.number().optional(),
    currency: z.string().optional()
  })
  .optional();

export let searchOrders = SlateTool.create(spec, {
  name: 'Search Orders',
  key: 'search_orders',
  description: `Search for orders across one or more locations. Supports filtering by date range, fulfillment state, customer, and other criteria. Use this to find and list orders.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      locationIds: z.array(z.string()).describe('Location IDs to search orders in'),
      cursor: z.string().optional().describe('Pagination cursor from previous response'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      query: z
        .object({
          filter: z
            .record(z.string(), z.any())
            .optional()
            .describe(
              'Filter criteria (e.g., date_time_filter, fulfillment_filter, state_filter, customer_filter)'
            ),
          sort: z
            .record(z.string(), z.any())
            .optional()
            .describe('Sort criteria (e.g., { sort_field: "CREATED_AT", sort_order: "DESC" })')
        })
        .optional()
        .describe('Search query with filter and sort options')
    })
  )
  .output(
    z.object({
      orders: z.array(
        z.object({
          orderId: z.string().optional(),
          locationId: z.string().optional(),
          customerId: z.string().optional(),
          referenceId: z.string().optional(),
          state: z.string().optional(),
          totalMoney: moneySchema,
          totalTaxMoney: moneySchema,
          totalDiscountMoney: moneySchema,
          totalTipMoney: moneySchema,
          lineItemCount: z.number().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          closedAt: z.string().optional()
        })
      ),
      cursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.searchOrders({
      locationIds: ctx.input.locationIds,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit,
      query: ctx.input.query
    });

    let orders = result.orders.map(o => ({
      orderId: o.id,
      locationId: o.location_id,
      customerId: o.customer_id,
      referenceId: o.reference_id,
      state: o.state,
      totalMoney: o.total_money,
      totalTaxMoney: o.total_tax_money,
      totalDiscountMoney: o.total_discount_money,
      totalTipMoney: o.total_tip_money,
      lineItemCount: o.line_items?.length,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
      closedAt: o.closed_at
    }));

    return {
      output: { orders, cursor: result.cursor },
      message: `Found **${orders.length}** order(s).${result.cursor ? ' More results available.' : ''}`
    };
  })
  .build();
