import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { validateIntegerFields } from '../lib/validation';
import { spec } from '../spec';

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `List ticket orders for a specific event or across an entire organization. Returns order details including buyer information, costs, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().optional().describe('Filter orders by a specific event ID.'),
      organizationId: organizationIdSchema,
      status: z.string().optional().describe('Filter by order status.'),
      changedSince: z
        .string()
        .optional()
        .describe('Only return orders changed since this UTC timestamp.'),
      page: z.number().optional().describe('Page number for pagination.'),
      continuation: z
        .string()
        .optional()
        .describe('Continuation token returned by the previous page.')
    })
  )
  .output(
    z.object({
      orders: z
        .array(
          z.object({
            orderId: z.string().describe('The unique order ID.'),
            eventId: z.string().optional().describe('The event ID the order is for.'),
            name: z.string().optional().describe('Name on the order.'),
            email: z.string().optional().describe('Email on the order.'),
            status: z.string().optional().describe('Order status.'),
            created: z.string().optional().describe('When the order was created.'),
            changed: z.string().optional().describe('When the order was last changed.'),
            costs: z
              .object({
                gross: z.string().optional(),
                tax: z.string().optional(),
                fees: z.string().optional()
              })
              .optional()
              .describe('Cost breakdown.')
          })
        )
        .describe('List of orders.'),
      continuation: z.string().optional().describe('Token to retrieve the next page.'),
      hasMore: z.boolean().describe('Whether there are more pages.')
    })
  )
  .handleInvocation(async ctx => {
    validateIntegerFields(ctx.input, ['page'], 1);
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.eventId) {
      result = await client.listEventOrders(ctx.input.eventId, {
        status: ctx.input.status,
        changed_since: ctx.input.changedSince,
        continuation: ctx.input.continuation,
        page: ctx.input.page
      });
    } else {
      let orgId = ctx.input.organizationId || ctx.config.organizationId;
      if (!orgId) {
        throw createApiServiceError('Either eventId or organizationId is required.');
      }
      result = await client.listOrganizationOrders(orgId, {
        status: ctx.input.status,
        changed_since: ctx.input.changedSince,
        continuation: ctx.input.continuation,
        page: ctx.input.page
      });
    }

    let orders = (result.orders || []).map((order: any) => ({
      orderId: order.id,
      eventId: order.event_id ?? undefined,
      name: order.name ?? undefined,
      email: order.email ?? undefined,
      status: order.status ?? undefined,
      created: order.created ?? undefined,
      changed: order.changed ?? undefined,
      costs:
        (order.costs ?? undefined)
          ? {
              gross: order.costs.gross?.display ?? undefined,
              tax: order.costs.tax?.display ?? undefined,
              fees: order.costs.eventbrite_fee?.display ?? undefined
            }
          : undefined
    }));

    return {
      output: {
        orders,
        continuation: result.pagination?.continuation ?? undefined,
        hasMore: result.pagination?.has_more_items || false
      },
      message: `Found **${orders.length}** orders.`
    };
  })
  .build();
