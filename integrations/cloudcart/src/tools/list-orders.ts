import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `Search and list orders from the CloudCart store. Supports filtering by date range and geo zone. Results are paginated and sortable.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number to retrieve (1-based)'),
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of orders per page (max 100)'),
      sort: z
        .string()
        .optional()
        .describe('Sort field, prefix with - for descending (e.g. "-date_added")'),
      startDate: z.string().optional().describe('Filter orders from this date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('Filter orders until this date (YYYY-MM-DD)'),
      geoZoneId: z.string().optional().describe('Filter by geographic zone ID'),
      geoZoneName: z.string().optional().describe('Filter by geographic zone name')
    })
  )
  .output(
    z.object({
      orders: z.array(
        z.object({
          orderId: z.string(),
          customerEmail: z.string().optional(),
          customerFirstName: z.string().optional(),
          customerLastName: z.string().optional(),
          status: z.string().optional(),
          statusFulfillment: z.string().optional(),
          priceTotal: z.any().optional(),
          currency: z.string().optional(),
          quantity: z.any().optional(),
          dateAdded: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      totalCount: z.number(),
      currentPage: z.number(),
      lastPage: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

    let filters: Record<string, string> = {};
    if (ctx.input.startDate) filters.start_date = ctx.input.startDate;
    if (ctx.input.endDate) filters.end_date = ctx.input.endDate;
    if (ctx.input.geoZoneId) filters.geo_zone_id = ctx.input.geoZoneId;
    if (ctx.input.geoZoneName) filters.geo_zone_name = ctx.input.geoZoneName;

    let res = await client.listOrders({
      pagination: { pageNumber: ctx.input.pageNumber, pageSize: ctx.input.pageSize },
      sort: ctx.input.sort,
      filters: Object.keys(filters).length > 0 ? filters : undefined
    });

    let orders = res.data.map(o => ({
      orderId: o.id,
      customerEmail: o.attributes.customer_email,
      customerFirstName: o.attributes.customer_first_name,
      customerLastName: o.attributes.customer_last_name,
      status: o.attributes.status,
      statusFulfillment: o.attributes.status_fulfillment,
      priceTotal: o.attributes.price_total,
      currency: o.attributes.currency,
      quantity: o.attributes.quantity,
      dateAdded: o.attributes.date_added,
      updatedAt: o.attributes.updated_at
    }));

    return {
      output: {
        orders,
        totalCount: res.meta.total,
        currentPage: res.meta['current-page'],
        lastPage: res.meta['last-page']
      },
      message: `Found **${res.meta.total}** orders (page ${res.meta['current-page']} of ${res.meta['last-page']}).`
    };
  })
  .build();
