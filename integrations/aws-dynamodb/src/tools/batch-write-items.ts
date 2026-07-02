import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let attributeValueSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    S: z.string().optional(),
    N: z.string().optional(),
    B: z.string().optional(),
    SS: z.array(z.string()).optional(),
    NS: z.array(z.string()).optional(),
    BS: z.array(z.string()).optional(),
    M: z.record(z.string(), attributeValueSchema).optional(),
    L: z.array(attributeValueSchema).optional(),
    NULL: z.boolean().optional(),
    BOOL: z.boolean().optional()
  })
);

export let batchWriteItems = SlateTool.create(spec, {
  name: 'Batch Write Items',
  key: 'batch_write_items',
  description: `Put or delete multiple items across one or more DynamoDB tables in a single request.
Supports up to 25 put/delete operations per batch. Does not support update operations — use individual UpdateItem for that.`,
  constraints: [
    'Maximum 25 operations per batch',
    'Individual items cannot exceed 400 KB',
    'Does not support conditional expressions or update operations'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      operations: z
        .record(
          z.string(),
          z.array(
            z.object({
              putItem: z
                .record(z.string(), attributeValueSchema)
                .optional()
                .describe('Item to put in DynamoDB JSON format'),
              deleteKey: z
                .record(z.string(), attributeValueSchema)
                .optional()
                .describe('Primary key of item to delete in DynamoDB JSON format')
            })
          )
        )
        .describe('Map of table name to array of put/delete operations')
    })
  )
  .output(
    z.object({
      unprocessedItems: z
        .record(z.string(), z.any())
        .optional()
        .describe('Items that were not processed (retry these)'),
      hasUnprocessed: z
        .boolean()
        .describe('Whether there are unprocessed items requiring retry')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let requestItems: Record<string, any[]> = {};
    for (let [tableName, ops] of Object.entries(ctx.input.operations)) {
      requestItems[tableName] = ops.map(op => {
        if (op.putItem) {
          return { PutRequest: { Item: op.putItem } };
        }
        if (op.deleteKey) {
          return { DeleteRequest: { Key: op.deleteKey } };
        }
        return {};
      });
    }

    let result = await client.batchWriteItem({ requestItems });
    let hasUnprocessed =
      result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0;

    let totalOps = Object.values(ctx.input.operations).reduce(
      (sum, ops) => sum + ops.length,
      0
    );

    return {
      output: {
        unprocessedItems: result.UnprocessedItems,
        hasUnprocessed: !!hasUnprocessed
      },
      message: `Batch write completed for **${totalOps}** operations${hasUnprocessed ? ' (some items unprocessed — retry recommended)' : ''}`
    };
  })
  .build();
