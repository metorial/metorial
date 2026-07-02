import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSalesOrder = SlateTool.create(spec, {
  name: 'Get Sales Order',
  key: 'get_sales_order',
  description: `Retrieve sales orders and optionally their line items from ForceManager.
Fetch by ID or list/search with filtering. When retrieving by ID, line items can be included automatically.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      salesOrderId: z.number().optional().describe('Specific sales order ID to retrieve'),
      query: z.string().optional().describe('ForceManager query language filter'),
      accountId: z.number().optional().describe('Filter by account ID'),
      salesRepId: z.number().optional().describe('Filter by sales rep ID'),
      includeLines: z
        .boolean()
        .optional()
        .describe('Include line items when fetching by ID (default: false)'),
      page: z.number().optional().describe('Page number (0-indexed)')
    })
  )
  .output(
    z.object({
      salesOrders: z.array(z.any()).describe('List of matching sales order records'),
      lines: z
        .array(z.any())
        .optional()
        .describe('Line items (only when fetching single order with includeLines)'),
      totalCount: z.number().describe('Number of records returned'),
      nextPage: z.number().nullable().describe('Next page number, or null if no more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.salesOrderId) {
      let salesOrder = await client.getSalesOrder(ctx.input.salesOrderId);
      let lines: any[] | undefined;
      if (ctx.input.includeLines) {
        let linesResult = await client.listSalesOrderLines({
          q: `salesOrderId=${ctx.input.salesOrderId}`
        });
        lines = linesResult.records;
      }
      return {
        output: { salesOrders: [salesOrder], lines, totalCount: 1, nextPage: null },
        message: `Retrieved sales order ID **${ctx.input.salesOrderId}**${lines ? ` with ${lines.length} line item(s)` : ''}`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.query) params.q = ctx.input.query;
    if (ctx.input.accountId) params.accountId = ctx.input.accountId;
    if (ctx.input.salesRepId) params.salesRepId = ctx.input.salesRepId;

    let result = await client.listSalesOrders(params, ctx.input.page);

    return {
      output: {
        salesOrders: result.records,
        totalCount: result.entityCount,
        nextPage: result.nextPage
      },
      message: `Found **${result.entityCount}** sales order(s)${result.nextPage !== null ? ` (more pages available)` : ''}`
    };
  })
  .build();
