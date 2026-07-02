import { SlateTool } from 'slates';
import { z } from 'zod';
import { RocketadminClient } from '../lib/client';
import { spec } from '../spec';

export let deleteRow = SlateTool.create(spec, {
  name: 'Delete Row',
  key: 'delete_row',
  description: `Delete one or more rows from a database table by primary key. Supports both single and bulk deletion.`,
  instructions: [
    'For single deletion, provide the primaryKey object.',
    'For bulk deletion, provide bulkPrimaryKeys as an array of primary key objects.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the database connection'),
      tableName: z.string().describe('Name of the table'),
      primaryKey: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Primary key of the row to delete (e.g., {"id": 1})'),
      bulkPrimaryKeys: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of primary keys for bulk deletion'),
      masterPassword: z
        .string()
        .optional()
        .describe('Master password if the connection uses client-side encryption')
    })
  )
  .output(
    z.object({
      deletedCount: z.number().describe('Number of rows deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RocketadminClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      masterPassword: ctx.input.masterPassword
    });

    if (ctx.input.bulkPrimaryKeys && ctx.input.bulkPrimaryKeys.length > 0) {
      await client.bulkDeleteRows(
        ctx.input.connectionId,
        ctx.input.tableName,
        ctx.input.bulkPrimaryKeys
      );
      return {
        output: { deletedCount: ctx.input.bulkPrimaryKeys.length },
        message: `Deleted **${ctx.input.bulkPrimaryKeys.length}** row(s) from **${ctx.input.tableName}**.`
      };
    }

    if (!ctx.input.primaryKey) {
      throw new Error('Either primaryKey or bulkPrimaryKeys must be provided');
    }

    await client.deleteRow(ctx.input.connectionId, ctx.input.tableName, ctx.input.primaryKey);

    return {
      output: { deletedCount: 1 },
      message: `Deleted 1 row from **${ctx.input.tableName}**.`
    };
  })
  .build();
