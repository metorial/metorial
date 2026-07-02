import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchOrders = SlateTool.create(spec, {
  name: 'Search Orders',
  key: 'search_orders',
  description: `Search for orders across a date range with optional filtering by status. Supports cursor-based pagination for large result sets. Can also look up specific orders by number/ID and include scheduling information.`,
  instructions: [
    'Use the afterTag from a previous response to paginate through results',
    'Omit afterTag on the first request'
  ],
  constraints: ['Date range can span up to 35 days', 'Returns up to 500 orders per request'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
      orderStatus: z
        .array(
          z.enum(['unscheduled', 'scheduled', 'success', 'failed', 'rejected', 'cancelled'])
        )
        .optional()
        .describe('Filter by order status(es)'),
      orders: z
        .array(
          z.object({
            orderNo: z.string().optional(),
            orderId: z.string().optional()
          })
        )
        .optional()
        .describe('Specific orders to look up'),
      includeOrderData: z.boolean().optional().describe('Include full order data in results'),
      includeScheduleInformation: z
        .boolean()
        .optional()
        .describe('Include scheduling info (driver, stop number, times)'),
      afterTag: z.string().optional().describe('Pagination cursor from previous response')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      orders: z.array(z.record(z.string(), z.unknown())).describe('Matching orders'),
      tag: z.string().optional().describe('Cursor tag for next page'),
      remainingOrders: z.number().optional().describe('Number of orders remaining')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, unknown> = {};

    if (ctx.input.dateFrom && ctx.input.dateTo) {
      body.dateRange = { from: ctx.input.dateFrom, to: ctx.input.dateTo };
    }
    if (ctx.input.orderStatus) body.orderStatus = ctx.input.orderStatus;
    if (ctx.input.orders) {
      body.orders = ctx.input.orders.map(o => {
        let req: Record<string, unknown> = {};
        if (o.orderNo) req.orderNo = o.orderNo;
        if (o.orderId) req.id = o.orderId;
        return req;
      });
    }
    if (ctx.input.includeOrderData !== undefined)
      body.includeOrderData = ctx.input.includeOrderData;
    if (ctx.input.includeScheduleInformation !== undefined)
      body.includeScheduleInformation = ctx.input.includeScheduleInformation;
    if (ctx.input.afterTag) body.after_tag = ctx.input.afterTag;

    let result = await client.searchOrders(body);

    return {
      output: {
        success: result.success,
        orders: result.orders || [],
        tag: result.tag,
        remainingOrders: result.remainingOrders
      },
      message: `Found **${(result.orders || []).length}** orders.${result.remainingOrders ? ` **${result.remainingOrders}** more available.` : ''}`
    };
  })
  .build();
