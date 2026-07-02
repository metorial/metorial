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

export let getItem = SlateTool.create(spec, {
  name: 'Get Item',
  key: 'get_item',
  description: `Retrieve a single item from a DynamoDB table by its primary key. Returns the full item or specific attributes via projection expression.
Supports strongly consistent reads.`,
  instructions: [
    'The key must include the partition key and sort key (if the table has one) in DynamoDB JSON format'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table'),
      key: z
        .record(z.string(), attributeValueSchema)
        .describe('Primary key of the item in DynamoDB JSON format'),
      consistentRead: z
        .boolean()
        .optional()
        .default(false)
        .describe('Use strongly consistent read'),
      projectionExpression: z
        .string()
        .optional()
        .describe('Comma-separated list of attributes to retrieve'),
      expressionAttributeNames: z
        .record(z.string(), z.string())
        .optional()
        .describe('Substitution tokens for reserved words in projection expression')
    })
  )
  .output(
    z.object({
      found: z.boolean().describe('Whether the item was found'),
      item: z
        .record(z.string(), z.any())
        .optional()
        .describe('The retrieved item in DynamoDB JSON format')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.getItem({
      tableName: ctx.input.tableName,
      key: ctx.input.key,
      consistentRead: ctx.input.consistentRead,
      projectionExpression: ctx.input.projectionExpression,
      expressionAttributeNames: ctx.input.expressionAttributeNames
    });

    let found = result.Item !== undefined && result.Item !== null;

    return {
      output: {
        found,
        item: result.Item
      },
      message: found
        ? `Found item in **${ctx.input.tableName}**`
        : `No item found in **${ctx.input.tableName}** for the given key`
    };
  })
  .build();
