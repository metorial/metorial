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

export let executePartiql = SlateTool.create(spec, {
  name: 'Execute PartiQL',
  key: 'execute_partiql',
  description: `Execute a PartiQL statement against DynamoDB. PartiQL is a SQL-compatible query language that supports SELECT, INSERT, UPDATE, and DELETE operations.
Useful for users familiar with SQL syntax as an alternative to DynamoDB's native expression-based API.`,
  instructions: [
    'SELECT: SELECT * FROM "MyTable" WHERE pk = \'value\'',
    "INSERT: INSERT INTO \"MyTable\" value {'pk': 'val', 'name': 'test'}",
    "UPDATE: UPDATE \"MyTable\" SET name = 'new' WHERE pk = 'val'",
    'DELETE: DELETE FROM "MyTable" WHERE pk = \'val\'',
    'Table names must be double-quoted, string values single-quoted'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      statement: z.string().describe('PartiQL SQL statement to execute'),
      parameters: z
        .array(attributeValueSchema)
        .optional()
        .describe('Positional parameters for the statement using ? placeholders'),
      consistentRead: z
        .boolean()
        .optional()
        .default(false)
        .describe('Use strongly consistent read for SELECT statements'),
      nextToken: z.string().optional().describe('Pagination token from a previous execution'),
      limit: z.number().optional().describe('Maximum number of items to return')
    })
  )
  .output(
    z.object({
      items: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Result items for SELECT statements'),
      nextToken: z
        .string()
        .optional()
        .describe('Pagination token if more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.executeStatement({
      statement: ctx.input.statement,
      parameters: ctx.input.parameters,
      consistentRead: ctx.input.consistentRead,
      nextToken: ctx.input.nextToken,
      limit: ctx.input.limit
    });

    let itemCount = result.Items?.length || 0;

    return {
      output: {
        items: result.Items,
        nextToken: result.NextToken
      },
      message: `PartiQL statement executed successfully${itemCount > 0 ? `, returned **${itemCount}** items` : ''}${result.NextToken ? ' (more pages available)' : ''}`
    };
  })
  .build();
