import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { postgresServiceError } from '../lib/errors';
import { createClient, qualifiedTableName } from '../lib/helpers';
import { spec } from '../spec';

export let deleteRows = SlateTool.create(spec, {
  name: 'Delete Rows',
  key: 'delete_rows',
  description: `Delete rows from a PostgreSQL table based on a WHERE condition.
Supports returning the deleted rows and requires explicit confirmation for full-table deletes.`,
  instructions: [
    'Always provide a WHERE condition to target specific rows.',
    'Set confirmDeleteAll to true to delete all rows when no WHERE condition is provided.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table to delete from'),
      schemaName: z.string().optional().describe('Schema containing the table'),
      where: z
        .string()
        .optional()
        .describe(
          'SQL WHERE condition (without the WHERE keyword). Example: "id = 1 AND status = \'inactive\'"'
        ),
      confirmDeleteAll: z
        .boolean()
        .optional()
        .default(false)
        .describe('Must be true to delete all rows when no WHERE condition is specified'),
      returning: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to return the deleted rows using RETURNING *')
    })
  )
  .output(
    z.object({
      deletedCount: z.number().describe('Number of rows deleted'),
      returnedRows: z
        .array(z.record(z.string(), z.any()))
        .describe('Deleted rows (if returning was enabled)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let schema = ctx.input.schemaName || ctx.config.defaultSchema;
    let fullTableName = qualifiedTableName(ctx.input.tableName, schema);

    if (!ctx.input.where && !ctx.input.confirmDeleteAll) {
      throw postgresServiceError(
        'No WHERE condition specified. Set confirmDeleteAll to true to delete all rows from the table.'
      );
    }

    let sql = `DELETE FROM ${fullTableName}`;

    if (ctx.input.where) {
      sql += ` WHERE ${ctx.input.where}`;
    }

    if (ctx.input.returning) {
      sql += ' RETURNING *';
    }

    ctx.info(
      `Deleting rows from ${fullTableName}${ctx.input.where ? ` where ${ctx.input.where}` : ' (all rows)'}`
    );
    let result = await client.query(sql, ctx.config.queryTimeout);

    return {
      output: {
        deletedCount: result.rowCount ?? 0,
        returnedRows: result.rows
      },
      message: `Deleted **${result.rowCount ?? 0}** row(s) from \`${ctx.input.tableName}\`.`
    };
  })
  .build();
