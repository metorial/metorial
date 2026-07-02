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

export let batchGetItems = SlateTool.create(spec, {
  name: 'Batch Get Items',
  key: 'batch_get_items',
  description: `Retrieve multiple items from one or more DynamoDB tables in a single request using their primary keys.
Supports up to 100 items per batch and optional projection expressions.`,
  constraints: ['Maximum 100 items per batch', 'Total response size cannot exceed 16 MB'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tables: z
        .record(
          z.string(),
          z.object({
            keys: z
              .array(z.record(z.string(), attributeValueSchema))
              .describe('Primary keys of items to retrieve'),
            consistentRead: z.boolean().optional().describe('Use strongly consistent reads'),
            projectionExpression: z.string().optional().describe('Attributes to retrieve'),
            expressionAttributeNames: z
              .record(z.string(), z.string())
              .optional()
              .describe('Attribute name substitutions')
          })
        )
        .describe('Map of table name to keys and options')
    })
  )
  .output(
    z.object({
      responses: z
        .record(z.string(), z.array(z.record(z.string(), z.any())))
        .describe('Map of table name to retrieved items'),
      unprocessedKeys: z
        .record(z.string(), z.any())
        .optional()
        .describe('Keys that were not processed (retry these)'),
      hasUnprocessed: z
        .boolean()
        .describe('Whether there are unprocessed keys requiring retry')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let requestItems: Record<string, any> = {};
    for (let [tableName, tableReq] of Object.entries(ctx.input.tables)) {
      requestItems[tableName] = {
        Keys: tableReq.keys,
        ...(tableReq.consistentRead !== undefined && {
          ConsistentRead: tableReq.consistentRead
        }),
        ...(tableReq.projectionExpression && {
          ProjectionExpression: tableReq.projectionExpression
        }),
        ...(tableReq.expressionAttributeNames && {
          ExpressionAttributeNames: tableReq.expressionAttributeNames
        })
      };
    }

    let result = await client.batchGetItem({ requestItems });
    let hasUnprocessed =
      result.UnprocessedKeys && Object.keys(result.UnprocessedKeys).length > 0;

    let totalItems = Object.values(result.Responses || {}).reduce(
      (sum: number, items: any) => sum + items.length,
      0
    );

    return {
      output: {
        responses: result.Responses || {},
        unprocessedKeys: result.UnprocessedKeys,
        hasUnprocessed: !!hasUnprocessed
      },
      message: `Batch get returned **${totalItems}** items${hasUnprocessed ? ' (some keys unprocessed — retry recommended)' : ''}`
    };
  })
  .build();
