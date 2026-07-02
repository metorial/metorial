import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTransaction = SlateTool.create(spec, {
  name: 'Create Transaction',
  key: 'create_transaction',
  description: `Create an inventory transaction in BoxHero. Supports all four transaction types:
- **Stock In**: Record items entering inventory (requires destination location for Business mode)
- **Stock Out**: Record items leaving inventory (requires source location for Business mode)
- **Adjust Stock**: Correct inventory quantities (use positive or negative quantities)
- **Move Stock**: Transfer items between locations (requires both source and destination locations)

Optionally attach a partner (supplier for Stock In, customer for Stock Out) and a memo.`,
  instructions: [
    'For "move" type, both fromLocationId and toLocationId are required.',
    'For "in" type, toLocationId specifies the destination; partnerId can reference a supplier.',
    'For "out" type, fromLocationId specifies the source; partnerId can reference a customer.',
    'Quantities support decimal values (e.g., 1.5).'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      type: z.enum(['in', 'out', 'adjust', 'move']).describe('Transaction type'),
      items: z
        .array(
          z.object({
            itemId: z.number().describe('ID of the item'),
            quantity: z
              .number()
              .describe(
                'Quantity to transact (positive for in/adjust-up, negative for adjust-down)'
              )
          })
        )
        .min(1)
        .describe('Items and quantities for this transaction'),
      toLocationId: z
        .number()
        .optional()
        .describe('Destination location ID (required for "in" and "move" in Business mode)'),
      fromLocationId: z
        .number()
        .optional()
        .describe('Source location ID (required for "out" and "move" in Business mode)'),
      partnerId: z
        .number()
        .optional()
        .describe('Partner ID — supplier for Stock In, customer for Stock Out'),
      memo: z.string().optional().describe('Optional notes or memo for the transaction'),
      transactionTime: z
        .string()
        .optional()
        .describe('Transaction timestamp in ISO 8601 format (defaults to current time)')
    })
  )
  .output(
    z.object({
      transactionId: z.number().describe('ID of the created transaction'),
      type: z.string().describe('Transaction type'),
      countOfItems: z.number().describe('Number of distinct items'),
      totalQuantity: z.number().describe('Total quantity across all items'),
      url: z.string().describe('Direct link to view the transaction in BoxHero')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createTransaction({
      type: ctx.input.type,
      items: ctx.input.items,
      toLocationId: ctx.input.toLocationId,
      fromLocationId: ctx.input.fromLocationId,
      partnerId: ctx.input.partnerId,
      memo: ctx.input.memo,
      transactionTime: ctx.input.transactionTime
    });

    let typeLabels: Record<string, string> = {
      in: 'Stock In',
      out: 'Stock Out',
      adjust: 'Adjust Stock',
      move: 'Move Stock'
    };

    return {
      output: {
        transactionId: result.id,
        type: result.type,
        countOfItems: result.count_of_items,
        totalQuantity: result.total_quantity,
        url: result.url
      },
      message: `Created **${typeLabels[result.type] || result.type}** transaction #${result.id} with ${result.count_of_items} item(s), total quantity: ${result.total_quantity}.`
    };
  })
  .build();
