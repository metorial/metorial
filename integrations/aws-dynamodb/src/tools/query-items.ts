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

export let queryItems = SlateTool.create(spec, {
  name: 'Query Items',
  key: 'query_items',
  description: `Query items from a DynamoDB table or secondary index using a key condition expression on the partition key (and optionally the sort key).
Efficient for retrieving items that share the same partition key. Supports filtering, projection, pagination, and sort order control.`,
  instructions: [
    'keyConditionExpression must reference the partition key and optionally the sort key',
    'Use filterExpression for additional non-key filtering (applied after the query)',
    'Use scanIndexForward=false for descending sort order'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table to query'),
      indexName: z.string().optional().describe('Name of a secondary index to query'),
      keyConditionExpression: z
        .string()
        .describe(
          'Key condition expression (e.g., "#pk = :pkVal AND #sk BETWEEN :start AND :end")'
        ),
      filterExpression: z
        .string()
        .optional()
        .describe('Additional filter expression applied after query'),
      projectionExpression: z
        .string()
        .optional()
        .describe('Comma-separated attributes to return'),
      expressionAttributeNames: z
        .record(z.string(), z.string())
        .optional()
        .describe('Substitution tokens for attribute names'),
      expressionAttributeValues: z
        .record(z.string(), attributeValueSchema)
        .optional()
        .describe('Substitution tokens for attribute values'),
      limit: z.number().optional().describe('Maximum number of items to evaluate'),
      scanIndexForward: z
        .boolean()
        .optional()
        .default(true)
        .describe('true for ascending, false for descending sort key order'),
      consistentRead: z
        .boolean()
        .optional()
        .default(false)
        .describe('Use strongly consistent read'),
      exclusiveStartKey: z
        .record(z.string(), attributeValueSchema)
        .optional()
        .describe('Pagination token from a previous query')
    })
  )
  .output(
    z.object({
      items: z
        .array(z.record(z.string(), z.any()))
        .describe('Retrieved items in DynamoDB JSON format'),
      count: z.number().describe('Number of items returned'),
      scannedCount: z.number().describe('Number of items evaluated before filtering'),
      lastEvaluatedKey: z
        .record(z.string(), z.any())
        .optional()
        .describe('Pagination token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.query({
      tableName: ctx.input.tableName,
      indexName: ctx.input.indexName,
      keyConditionExpression: ctx.input.keyConditionExpression,
      filterExpression: ctx.input.filterExpression,
      projectionExpression: ctx.input.projectionExpression,
      expressionAttributeNames: ctx.input.expressionAttributeNames,
      expressionAttributeValues: ctx.input.expressionAttributeValues,
      limit: ctx.input.limit,
      scanIndexForward: ctx.input.scanIndexForward,
      consistentRead: ctx.input.consistentRead,
      exclusiveStartKey: ctx.input.exclusiveStartKey
    });

    return {
      output: {
        items: result.Items || [],
        count: result.Count || 0,
        scannedCount: result.ScannedCount || 0,
        lastEvaluatedKey: result.LastEvaluatedKey
      },
      message: `Query returned **${result.Count || 0}** items from **${ctx.input.tableName}**${ctx.input.indexName ? ` (index: ${ctx.input.indexName})` : ''}${result.LastEvaluatedKey ? ' (more pages available)' : ''}`
    };
  })
  .build();
