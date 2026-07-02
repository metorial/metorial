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

export let transactGetItems = SlateTool.create(spec, {
  name: 'Transact Get Items',
  key: 'transact_get_items',
  description: `Atomically retrieve up to 100 items from one or more DynamoDB tables in the same account and region.
Use this when multiple strongly related reads must succeed or fail together.`,
  constraints: [
    'Maximum 100 item reads per transaction',
    'The aggregate size of retrieved items cannot exceed 4 MB',
    'Transactions cannot read from secondary indexes'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      items: z
        .array(
          z.object({
            tableName: z.string().describe('Name of the table to read from'),
            key: z
              .record(z.string(), attributeValueSchema)
              .describe('Primary key of the item in DynamoDB JSON format'),
            projectionExpression: z
              .string()
              .optional()
              .describe('Projection expression for this item'),
            expressionAttributeNames: z
              .record(z.string(), z.string())
              .optional()
              .describe('Attribute name substitutions for the projection expression')
          })
        )
        .min(1)
        .max(100)
        .describe('Items to retrieve transactionally'),
      returnConsumedCapacity: z
        .enum(['INDEXES', 'TOTAL', 'NONE'])
        .optional()
        .default('NONE')
        .describe('Whether to return consumed capacity details')
    })
  )
  .output(
    z.object({
      responses: z
        .array(
          z.object({
            index: z.number().describe('Zero-based position matching the requested item'),
            found: z.boolean().describe('Whether the item was found'),
            item: z
              .record(z.string(), z.any())
              .optional()
              .describe('Retrieved item in DynamoDB JSON format')
          })
        )
        .describe('Transactional read responses in request order'),
      consumedCapacity: z.array(z.any()).optional().describe('Consumed capacity details')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.transactGetItems({
      transactItems: ctx.input.items.map(item => ({
        Get: {
          TableName: item.tableName,
          Key: item.key,
          ProjectionExpression: item.projectionExpression,
          ExpressionAttributeNames: item.expressionAttributeNames
        }
      })),
      returnConsumedCapacity: ctx.input.returnConsumedCapacity
    });

    let responses = (result.Responses || []).map((response: any, index: number) => ({
      index,
      found: response?.Item !== undefined && response.Item !== null,
      item: response?.Item
    }));

    return {
      output: {
        responses,
        consumedCapacity: result.ConsumedCapacity
      },
      message: `Transactional read returned **${responses.filter((response: { found: boolean }) => response.found).length}** of **${ctx.input.items.length}** requested items`
    };
  })
  .build();
