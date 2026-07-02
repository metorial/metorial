import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPurchases = SlateTool.create(spec, {
  name: 'List Purchases',
  key: 'list_purchases',
  description: `Search and filter purchase/order records in your DPD account. Supports filtering by status, product, storefront, customer, date range, and total amount. Results are paginated at 100 records per page.`,
  instructions: [
    'Status codes: ACT (active/paid), PND (pending), RFD (refunded), ERR (payment error), CAN (canceled), HLD (held for review).',
    'Date filters accept formats like "2024-01-01", "last month", "yesterday" (PHP strtotime compatible).',
    'Use totalOp with total for price comparison: eq (equal), ne (not equal), gt (greater than), lt (less than).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['ACT', 'PND', 'RFD', 'ERR', 'CAN', 'HLD'])
        .optional()
        .describe('Filter by purchase status'),
      productId: z.number().optional().describe('Filter by product ID'),
      storefrontId: z.number().optional().describe('Filter by storefront ID'),
      customerId: z.number().optional().describe('Filter by customer ID'),
      subscriberId: z.number().optional().describe('Filter by subscriber ID'),
      customerEmail: z
        .string()
        .optional()
        .describe('Filter by customer email (starts-with match, case-insensitive)'),
      customerFirstName: z
        .string()
        .optional()
        .describe('Filter by customer first name (starts-with match, case-insensitive)'),
      customerLastName: z
        .string()
        .optional()
        .describe('Filter by customer last name (starts-with match, case-insensitive)'),
      dateMin: z
        .string()
        .optional()
        .describe('Minimum date filter (PHP strtotime format, e.g. "2024-01-01")'),
      dateMax: z
        .string()
        .optional()
        .describe('Maximum date filter (PHP strtotime format, e.g. "2024-12-31")'),
      total: z.string().optional().describe('Total amount to compare against'),
      totalOp: z
        .enum(['eq', 'ne', 'gt', 'lt'])
        .optional()
        .describe('Comparison operator for total: eq, ne, gt, or lt'),
      ship: z
        .boolean()
        .optional()
        .describe('Filter for purchases with unshipped tangible goods'),
      page: z.number().optional().describe('Page number for pagination (100 records per page)')
    })
  )
  .output(
    z.object({
      purchases: z.array(
        z.object({
          purchaseId: z.number().describe('Unique purchase ID'),
          status: z.string().describe('Purchase status code')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let purchases = await client.listPurchases(ctx.input);

    return {
      output: { purchases },
      message: `Found **${purchases.length}** purchase(s)${ctx.input.page ? ` on page ${ctx.input.page}` : ''}.`
    };
  })
  .build();
