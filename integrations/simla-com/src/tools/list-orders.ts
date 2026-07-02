import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `Search and list orders with flexible filtering. Supports filtering by status, customer, date range, delivery type, payment status, manager, and more. Returns paginated results with order summaries.`,
  constraints: ['Maximum 100 results per page.', 'Rate limited to 10 requests per second.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .object({
          ids: z.array(z.number()).optional().describe('Filter by internal order IDs'),
          externalIds: z.array(z.string()).optional().describe('Filter by external order IDs'),
          numbers: z.array(z.string()).optional().describe('Filter by order numbers'),
          customerId: z.number().optional().describe('Filter by customer internal ID'),
          customerExternalId: z.string().optional().describe('Filter by customer external ID'),
          email: z.string().optional().describe('Filter by email'),
          city: z.string().optional().describe('Filter by delivery city'),
          statuses: z.array(z.string()).optional().describe('Filter by status codes'),
          orderTypes: z.array(z.string()).optional().describe('Filter by order type codes'),
          orderMethods: z
            .array(z.string())
            .optional()
            .describe('Filter by order method codes'),
          deliveryTypes: z
            .array(z.string())
            .optional()
            .describe('Filter by delivery type codes'),
          paymentStatuses: z
            .array(z.string())
            .optional()
            .describe('Filter by payment status codes'),
          paymentTypes: z
            .array(z.string())
            .optional()
            .describe('Filter by payment type codes'),
          managers: z.array(z.number()).optional().describe('Filter by manager IDs'),
          createdAtFrom: z
            .string()
            .optional()
            .describe('Created from date (YYYY-MM-DD HH:MM:SS)'),
          createdAtTo: z.string().optional().describe('Created to date (YYYY-MM-DD HH:MM:SS)'),
          minSumm: z.number().optional().describe('Minimum order amount'),
          maxSumm: z.number().optional().describe('Maximum order amount'),
          shipped: z.boolean().optional().describe('Filter by shipped status'),
          customFields: z
            .record(z.string(), z.any())
            .optional()
            .describe('Filter by custom field values')
        })
        .optional()
        .describe('Filter criteria for searching orders'),
      page: z.number().optional().describe('Page number (default 1)'),
      limit: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      orders: z.array(
        z.object({
          orderId: z.number().optional(),
          externalId: z.string().optional(),
          number: z.string().optional(),
          status: z.string().optional(),
          orderType: z.string().optional(),
          orderMethod: z.string().optional(),
          createdAt: z.string().optional(),
          totalSumm: z.number().optional(),
          customerName: z.string().optional(),
          customerEmail: z.string().optional(),
          deliveryType: z.string().optional(),
          deliveryAddress: z.string().optional(),
          managerId: z.number().optional(),
          site: z.string().optional(),
          shipped: z.boolean().optional(),
          itemsCount: z.number().optional()
        })
      ),
      totalCount: z.number(),
      currentPage: z.number(),
      totalPages: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });

    let result = await client.getOrders(ctx.input.filter, ctx.input.page, ctx.input.limit);

    let orders = result.orders.map(o => ({
      orderId: o.id,
      externalId: o.externalId,
      number: o.number,
      status: o.status,
      orderType: o.orderType,
      orderMethod: o.orderMethod,
      createdAt: o.createdAt,
      totalSumm: o.totalSumm,
      customerName: [o.firstName, o.lastName].filter(Boolean).join(' ') || undefined,
      customerEmail: o.email,
      deliveryType: o.delivery?.code,
      deliveryAddress: o.delivery?.address?.text,
      managerId: o.managerId,
      site: o.site,
      shipped: o.shipped,
      itemsCount: o.items?.length
    }));

    return {
      output: {
        orders,
        totalCount: result.pagination.totalCount,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPageCount
      },
      message: `Found **${result.pagination.totalCount}** orders (page ${result.pagination.currentPage} of ${result.pagination.totalPageCount}). Returned ${orders.length} results.`
    };
  })
  .build();
