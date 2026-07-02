import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let locationSchema = z.object({
  locationId: z.number().describe('Location ID'),
  name: z.string().describe('Location name'),
  deleted: z.boolean().optional().describe('Whether the location has been deleted')
});

let transactionItemSchema = z.object({
  itemId: z.number().describe('Item ID'),
  name: z.string().describe('Item name'),
  quantity: z.number().describe('Transaction quantity'),
  deleted: z.boolean().optional().describe('Whether the item has been deleted'),
  toLocationNewStockLevel: z
    .number()
    .optional()
    .describe('Stock level at destination after transaction'),
  fromLocationNewStockLevel: z
    .number()
    .optional()
    .describe('Stock level at source after transaction')
});

let memberSchema = z.object({
  memberId: z.number().describe('Team member ID'),
  name: z.string().describe('Team member name'),
  deleted: z.boolean().optional().describe('Whether the member has been deleted')
});

let transactionSchema = z.object({
  transactionId: z.number().describe('Unique transaction ID'),
  type: z.string().describe('Transaction type: in, out, adjust, or move'),
  fromLocation: locationSchema.optional().describe('Source location (for move transactions)'),
  toLocation: locationSchema.optional().describe('Destination location'),
  items: z.array(transactionItemSchema).describe('Items involved in this transaction'),
  transactionTime: z.string().describe('When the transaction occurred (ISO 8601)'),
  createdAt: z.string().describe('When the transaction record was created (ISO 8601)'),
  createdBy: memberSchema.describe('Team member who created the transaction'),
  countOfItems: z.number().describe('Number of distinct items in the transaction'),
  totalQuantity: z.number().describe('Total quantity across all items'),
  memo: z.string().optional().describe('Optional notes attached to the transaction'),
  url: z.string().describe('Direct link to view the transaction in BoxHero'),
  revision: z.number().optional().describe('Revision number for edited transactions')
});

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `Retrieve inventory transactions from BoxHero. Automatically detects whether the team uses Basic or Business mode and queries the appropriate endpoint. Supports filtering by transaction type (in, out, adjust, move) and pagination.`,
  constraints: ['Rate limited to 5 requests per second.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['in', 'out', 'adjust', 'move'])
        .optional()
        .describe('Filter by transaction type'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of transactions to return per page'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      transactions: z.array(transactionSchema).describe('List of inventory transactions'),
      hasMore: z.boolean().describe('Whether more transactions are available'),
      cursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let team = await client.getTeam();
    let listFn =
      team.mode === 0
        ? client.listTransactions.bind(client)
        : client.listLocationTransactions.bind(client);

    let response = await listFn({
      type: ctx.input.type,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let transactions = response.items.map(tx => ({
      transactionId: tx.id,
      type: tx.type,
      fromLocation: tx.from_location
        ? {
            locationId: tx.from_location.id,
            name: tx.from_location.name,
            deleted: tx.from_location.deleted
          }
        : undefined,
      toLocation: tx.to_location
        ? {
            locationId: tx.to_location.id,
            name: tx.to_location.name,
            deleted: tx.to_location.deleted
          }
        : undefined,
      items: tx.items.map(item => ({
        itemId: item.id,
        name: item.name,
        quantity: item.quantity,
        deleted: item.deleted,
        toLocationNewStockLevel: item.to_location_new_stock_level,
        fromLocationNewStockLevel: item.from_location_new_stock_level
      })),
      transactionTime: tx.transaction_time,
      createdAt: tx.created_at,
      createdBy: {
        memberId: tx.created_by.id,
        name: tx.created_by.name,
        deleted: tx.created_by.deleted
      },
      countOfItems: tx.count_of_items,
      totalQuantity: tx.total_quantity,
      memo: tx.memo,
      url: tx.url,
      revision: tx.revision
    }));

    let typeLabel = ctx.input.type ? ` of type "${ctx.input.type}"` : '';
    return {
      output: {
        transactions,
        hasMore: response.has_more,
        cursor: response.cursor
      },
      message: `Retrieved ${transactions.length} transaction(s)${typeLabel}.${response.has_more ? ' More available — use the cursor for the next page.' : ''}`
    };
  })
  .build();
