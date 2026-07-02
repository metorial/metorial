import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, qualifiedTableName } from '../lib/helpers';
import { spec } from '../spec';

export let deleteRows = SlateTool.create(spec, {
  name: 'Delete Rows',
  key: 'delete_rows',
  description: `Delete rows from a MySQL table that match a WHERE condition.
Requires a WHERE clause to target specific rows unless confirmDeleteAll is explicitly set.`,
  instructions: [
    'Always provide a WHERE clause to avoid deleting all rows accidentally.',
    'Use confirmDeleteAll only when you intentionally want to delete every row in the table.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table to delete from'),
      databaseName: z.string().optional().describe('Database containing the table'),
      where: z
        .string()
        .optional()
        .describe(
          'SQL WHERE clause (without the WHERE keyword). Required unless confirmDeleteAll is true.'
        ),
      confirmDeleteAll: z
        .boolean()
        .optional()
        .default(false)
        .describe('Set to true to confirm deleting all rows when no WHERE clause is provided'),
      limit: z.number().optional().describe('Maximum number of rows to delete')
    })
  )
  .output(
    z.object({
      affectedRows: z.number().describe('Number of rows deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let db = ctx.input.databaseName || ctx.auth.database || ctx.config.defaultDatabase;
    let fullTableName = qualifiedTableName(ctx.input.tableName, db);

    if (!ctx.input.where && !ctx.input.confirmDeleteAll) {
      throw new Error(
        'A WHERE clause is required to delete rows. Set confirmDeleteAll to true to delete all rows.'
      );
    }

    let sql = `DELETE FROM ${fullTableName}`;
    if (ctx.input.where) {
      sql += ` WHERE ${ctx.input.where}`;
    }
    if (ctx.input.limit) {
      sql += ` LIMIT ${ctx.input.limit}`;
    }

    ctx.info(
      `Deleting rows from ${fullTableName}${ctx.input.where ? ` where ${ctx.input.where}` : ' (all rows)'}`
    );
    let result = await client.query(sql, ctx.config.queryTimeout);

    return {
      output: {
        affectedRows: result.affectedRows
      },
      message: `Deleted **${result.affectedRows}** row(s) from \`${ctx.input.tableName}\`.`
    };
  })
  .build();
