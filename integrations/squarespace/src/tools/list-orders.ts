import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `Retrieve orders from a Squarespace merchant site. Supports filtering by date range, fulfillment status, and customer. Returns up to 50 orders per request with pagination support.`,
  instructions: [
    'Use ISO 8601 UTC format for date parameters (e.g., "2024-01-01T00:00:00Z")',
    'Cannot combine cursor with date range filters — use one or the other'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modifiedAfter: z
        .string()
        .optional()
        .describe('ISO 8601 UTC datetime — only return orders modified after this date'),
      modifiedBefore: z
        .string()
        .optional()
        .describe('ISO 8601 UTC datetime — only return orders modified before this date'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      fulfillmentStatus: z
        .enum(['PENDING', 'FULFILLED', 'CANCELED'])
        .optional()
        .describe('Filter by fulfillment status'),
      paymentStates: z
        .string()
        .optional()
        .describe(
          'Comma-separated payment states to include, e.g. "PAID,REFUNDED". Defaults to Squarespace API defaults when omitted.'
        ),
      customerId: z.string().optional().describe('Filter orders by customer ID')
    })
  )
  .output(
    z.object({
      orders: z.array(z.any()).describe('Array of order objects'),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      nextPageCursor: z.string().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listOrders({
      modifiedAfter: ctx.input.modifiedAfter,
      modifiedBefore: ctx.input.modifiedBefore,
      cursor: ctx.input.cursor,
      fulfillmentStatus: ctx.input.fulfillmentStatus,
      paymentStates: ctx.input.paymentStates,
      customerId: ctx.input.customerId
    });

    return {
      output: {
        orders: result.result,
        hasNextPage: result.pagination.hasNextPage,
        nextPageCursor: result.pagination.nextPageCursor
      },
      message: `Retrieved **${result.result.length}** orders.${result.pagination.hasNextPage ? ' More results available via pagination.' : ''}`
    };
  })
  .build();
