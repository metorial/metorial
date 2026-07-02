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

export let scanItems = SlateTool.create(spec, {
  name: 'Scan Items',
  key: 'scan_items',
  description: `Scan an entire DynamoDB table or secondary index, returning all items or those matching a filter expression.
More flexible but less efficient than Query — reads every item in the table. Use Query when possible for better performance.`,
  constraints: [
    'Scans read the entire table and consume read capacity proportional to table size',
    'Use limit and pagination for large tables to avoid timeouts'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table to scan'),
      indexName: z.string().optional().describe('Name of a secondary index to scan'),
      filterExpression: z
        .string()
        .optional()
        .describe('Filter expression to apply after scanning'),
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
      limit: z.number().optional().describe('Maximum number of items to evaluate per page'),
      consistentRead: z
        .boolean()
        .optional()
        .default(false)
        .describe('Use strongly consistent read'),
      exclusiveStartKey: z
        .record(z.string(), attributeValueSchema)
        .optional()
        .describe('Pagination token from a previous scan')
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
    let result = await client.scan({
      tableName: ctx.input.tableName,
      indexName: ctx.input.indexName,
      filterExpression: ctx.input.filterExpression,
      projectionExpression: ctx.input.projectionExpression,
      expressionAttributeNames: ctx.input.expressionAttributeNames,
      expressionAttributeValues: ctx.input.expressionAttributeValues,
      limit: ctx.input.limit,
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
      message: `Scan returned **${result.Count || 0}** items from **${ctx.input.tableName}** (scanned ${result.ScannedCount || 0})${result.LastEvaluatedKey ? ' (more pages available)' : ''}`
    };
  })
  .build();
