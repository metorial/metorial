import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listTables = SlateTool.create(spec, {
  name: 'List Tables',
  key: 'list_tables',
  description: `List all DynamoDB table names in the configured region. Supports pagination for accounts with many tables.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of table names to return (1-100)'),
      startAfterTable: z
        .string()
        .optional()
        .describe('Table name to start listing after (for pagination)')
    })
  )
  .output(
    z.object({
      tableNames: z.array(z.string()).describe('List of table names'),
      lastEvaluatedTableName: z
        .string()
        .optional()
        .describe('Last table name evaluated, use as startAfterTable for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.listTables({
      limit: ctx.input.limit,
      exclusiveStartTableName: ctx.input.startAfterTable
    });

    return {
      output: {
        tableNames: result.TableNames || [],
        lastEvaluatedTableName: result.LastEvaluatedTableName
      },
      message: `Found **${(result.TableNames || []).length}** tables${result.LastEvaluatedTableName ? ' (more available)' : ''}`
    };
  })
  .build();
