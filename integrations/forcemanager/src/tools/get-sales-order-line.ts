import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSalesOrderLine = SlateTool.create(spec, {
  name: 'Get Sales Order Line',
  key: 'get_sales_order_line',
  description:
    'Retrieve a sales-order line by ID or list lines, optionally filtered by sales order. Returns line IDs, products, quantities, prices, and discounts for subsequent updates.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      lineId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Specific sales-order line ID to retrieve'),
      salesOrderId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Filter line items by sales-order ID'),
      query: z.string().optional().describe('ForceManager query language filter'),
      page: z.number().int().nonnegative().optional().describe('Page number (0-indexed)')
    })
  )
  .output(
    z.object({
      lines: z.array(z.any()).describe('Matching sales-order line records'),
      totalCount: z.number().describe('Number of records returned'),
      nextPage: z
        .number()
        .nullable()
        .describe('Request this page until an empty page returns null')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    if (ctx.input.lineId !== undefined) {
      let line = await client.getSalesOrderLine(ctx.input.lineId);
      return {
        output: { lines: [line], totalCount: 1, nextPage: null },
        message: `Retrieved sales-order line ID **${ctx.input.lineId}**`
      };
    }
    let params: Record<string, any> = { q: ctx.input.query };
    if (ctx.input.salesOrderId !== undefined) params.salesorderId = ctx.input.salesOrderId;
    let result = await client.listSalesOrderLines(params, ctx.input.page);
    return {
      output: {
        lines: result.records,
        totalCount: result.entityCount,
        nextPage: result.nextPage
      },
      message: `Retrieved **${result.entityCount}** sales-order line(s)`
    };
  })
  .build();
