import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createRocketadminClient } from '../lib/client';
import { spec } from '../spec';

export let updateRow = SlateTool.create(spec, {
  name: 'Update Row',
  key: 'update_row',
  description: `Update an existing row in a database table by its primary key. Supports updating a single row or multiple rows in bulk.`,
  instructions: [
    'For a single row, provide primaryKey as an object with the key column(s) and their values.',
    'For bulk updates, provide bulkPrimaryKeys as an array of primary key objects.'
  ],
  tags: {
    destructive: false
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
        .describe('Primary key of the row to update (e.g., {"id": 1})'),
      bulkPrimaryKeys: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of primary keys for bulk update'),
      rowData: z.record(z.string(), z.unknown()).describe('Column values to update'),
      masterPassword: z
        .string()
        .optional()
        .describe('Master password if the connection uses client-side encryption')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete provider response'),
      success: z.boolean().optional().describe('Whether Rocketadmin confirmed the operation'),
      row: z.record(z.string(), z.unknown()).optional().describe('The updated row'),
      updatedCount: z.number().optional().describe('Number of rows updated in bulk operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = createRocketadminClient(ctx.auth, ctx.config, ctx.input.masterPassword);

    if (ctx.input.primaryKey && ctx.input.bulkPrimaryKeys) {
      throw createApiServiceError('Provide either primaryKey or bulkPrimaryKeys, not both.');
    }
    if (ctx.input.bulkPrimaryKeys && ctx.input.bulkPrimaryKeys.length > 0) {
      let result = await client.bulkUpdateRows(
        ctx.input.connectionId,
        ctx.input.tableName,
        ctx.input.bulkPrimaryKeys,
        ctx.input.rowData
      );
      return {
        output: {
          raw: result,
          success: true
        },
        message: `Rocketadmin confirmed the bulk update in **${ctx.input.tableName}**. The API does not return an affected-row count.`
      };
    }

    if (!ctx.input.primaryKey) {
      throw createApiServiceError('Either primaryKey or bulkPrimaryKeys must be provided');
    }

    let row = await client.updateRow(
      ctx.input.connectionId,
      ctx.input.tableName,
      ctx.input.primaryKey,
      ctx.input.rowData
    );

    return {
      output: { row },
      message: `Row updated in **${ctx.input.tableName}** successfully.`
    };
  })
  .build();
