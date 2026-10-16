import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createRocketadminClient } from '../lib/client';
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
      connectionId: z
        .string()
        .describe(
          'Connection ID. Call list_connections to discover authorized connection IDs.'
        ),
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
      deletedCount: z
        .number()
        .optional()
        .describe(
          'Number of rows confirmed deleted; omitted for bulk operations because the API does not return an affected-row count'
        ),
      success: z.boolean().optional().describe('Whether Rocketadmin confirmed deletion'),
      raw: z.unknown().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createRocketadminClient(ctx.auth, ctx.config, ctx.input.masterPassword);

    if (ctx.input.primaryKey && ctx.input.bulkPrimaryKeys) {
      throw createApiServiceError('Provide either primaryKey or bulkPrimaryKeys, not both.');
    }
    if (ctx.input.bulkPrimaryKeys && ctx.input.bulkPrimaryKeys.length > 0) {
      let result = await client.bulkDeleteRows(
        ctx.input.connectionId,
        ctx.input.tableName,
        ctx.input.bulkPrimaryKeys
      );
      return {
        output: { success: true, raw: result },
        message: `Rocketadmin confirmed the bulk deletion in **${ctx.input.tableName}**. The API does not return an affected-row count.`
      };
    }

    if (!ctx.input.primaryKey) {
      throw createApiServiceError('Either primaryKey or bulkPrimaryKeys must be provided');
    }

    let result = await client.deleteRow(
      ctx.input.connectionId,
      ctx.input.tableName,
      ctx.input.primaryKey
    );

    return {
      output: { deletedCount: 1, success: true, raw: result },
      message: `Deleted 1 row from **${ctx.input.tableName}**.`
    };
  })
  .build();
