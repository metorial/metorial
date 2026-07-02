import { SlateTool } from 'slates';
import { z } from 'zod';
import { CardlyClient } from '../lib/client';
import { spec } from '../spec';

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `Retrieve orders placed by your organisation. Returns order details including status, line items, and cost information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of results (default 25)'),
      offset: z.number().optional().describe('Number of records to skip')
    })
  )
  .output(
    z.object({
      orders: z
        .array(
          z.object({
            orderId: z.string().describe('Unique order ID'),
            status: z.string().describe('Order status'),
            purchaseOrderNumber: z
              .string()
              .optional()
              .describe('Purchase order reference number'),
            lines: z.array(z.record(z.string(), z.unknown())).describe('Order line items'),
            cost: z.record(z.string(), z.unknown()).optional().describe('Cost breakdown'),
            createdAt: z.string().describe('Order creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of orders'),
      totalRecords: z.number().describe('Total number of orders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let result = await client.listOrders({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let orders = result.orders.map(o => ({
      orderId: o.id,
      status: o.status,
      purchaseOrderNumber: o.purchaseOrderNumber,
      lines: o.lines,
      cost: o.cost,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt
    }));

    return {
      output: {
        orders,
        totalRecords: result.meta.totalRecords
      },
      message: `Found **${orders.length}** order(s) (${result.meta.totalRecords} total).`
    };
  })
  .build();

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve detailed information about a specific order by its ID, including line items, cost, and current status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.string().describe('UUID of the order to retrieve')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Unique order ID'),
      status: z.string().describe('Order status'),
      purchaseOrderNumber: z.string().optional().describe('Purchase order reference number'),
      lines: z.array(z.record(z.string(), z.unknown())).describe('Order line items'),
      cost: z.record(z.string(), z.unknown()).optional().describe('Cost breakdown'),
      createdAt: z.string().describe('Order creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let order = await client.getOrder(ctx.input.orderId);

    return {
      output: {
        orderId: order.id,
        status: order.status,
        purchaseOrderNumber: order.purchaseOrderNumber,
        lines: order.lines,
        cost: order.cost,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      },
      message: `Order **${order.id}** — Status: **${order.status}**, ${order.lines.length} line item(s).`
    };
  })
  .build();
