import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoSquaredClient } from '../lib/client';
import { spec } from '../spec';

export let trackTransaction = SlateTool.create(spec, {
  name: 'Track Transaction',
  key: 'track_transaction',
  description: `Track an ecommerce transaction in GoSquared. Transactions record purchases with item details, revenue, and quantity. Data appears in Ecommerce Analytics and People CRM. Duplicate transaction IDs are automatically prevented.`,
  instructions: [
    'Test transactions cannot be removed from the Ecommerce dashboard. Use a test project for development.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      transactionId: z
        .string()
        .optional()
        .describe('Unique transaction ID. If provided, duplicates are prevented.'),
      personId: z
        .string()
        .optional()
        .describe(
          'Person ID to associate the transaction with (use "email:user@example.com" format)'
        ),
      visitorId: z
        .string()
        .optional()
        .describe('Anonymous visitor ID to associate the transaction with'),
      revenue: z
        .number()
        .optional()
        .describe('Total revenue amount. Auto-calculated from items if not provided.'),
      quantity: z
        .number()
        .optional()
        .describe('Total item quantity. Auto-calculated from items if not provided.'),
      items: z
        .array(
          z.object({
            name: z.string().describe('Item name'),
            price: z.number().optional().describe('Item price'),
            quantity: z.number().optional().describe('Item quantity'),
            categories: z.array(z.string()).optional().describe('Item categories')
          })
        )
        .optional()
        .describe('Line items in the transaction'),
      timestamp: z.string().optional().describe('Transaction timestamp in ISO 8601 format')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the transaction was tracked successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });

    await client.trackTransaction({
      transactionId: ctx.input.transactionId,
      personId: ctx.input.personId,
      visitorId: ctx.input.visitorId,
      revenue: ctx.input.revenue,
      quantity: ctx.input.quantity,
      items: ctx.input.items,
      timestamp: ctx.input.timestamp
    });

    return {
      output: { success: true },
      message: `Successfully tracked transaction${ctx.input.transactionId ? ` **${ctx.input.transactionId}**` : ''}.`
    };
  })
  .build();
