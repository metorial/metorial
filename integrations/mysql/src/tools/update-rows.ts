import { SlateTool } from 'slates';
import { z } from 'zod';
import { mysqlServiceError } from '../lib/errors';
import {
  createClient,
  escapeIdentifier,
  formatValue,
  qualifiedTableName
} from '../lib/helpers';
import { spec } from '../spec';

export let updateRows = SlateTool.create(spec, {
  name: 'Update Rows',
  key: 'update_rows',
  description: `Update rows in a MySQL table that match a WHERE condition. Provide the columns to update as key-value pairs.
Requires a WHERE clause to target specific rows unless confirmUpdateAll is explicitly set.`,
  instructions: [
    'Always provide a WHERE clause to avoid updating all rows accidentally.',
    'Use confirmUpdateAll only when you intentionally want to update every row in the table.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table to update'),
      databaseName: z.string().optional().describe('Database containing the table'),
      values: z
        .record(z.string(), z.any())
        .describe('Object of column names and their new values'),
      where: z
        .string()
        .optional()
        .describe(
          'SQL WHERE clause (without the WHERE keyword). Required unless confirmUpdateAll is true.'
        ),
      confirmUpdateAll: z
        .boolean()
        .optional()
        .default(false)
        .describe('Set to true to confirm updating all rows when no WHERE clause is provided')
    })
  )
  .output(
    z.object({
      affectedRows: z.number().describe('Number of rows updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let db = ctx.input.databaseName || ctx.auth.database || ctx.config.defaultDatabase;
    let fullTableName = qualifiedTableName(ctx.input.tableName, db);

    if (!ctx.input.where && !ctx.input.confirmUpdateAll) {
      throw mysqlServiceError(
        'A WHERE clause is required to update rows. Set confirmUpdateAll to true to update all rows.'
      );
    }

    let setClauses = Object.entries(ctx.input.values).map(
      ([col, val]) => `${escapeIdentifier(col)} = ${formatValue(val)}`
    );

    if (setClauses.length === 0) {
      throw mysqlServiceError('No values provided to update.');
    }

    let sql = `UPDATE ${fullTableName} SET ${setClauses.join(', ')}`;
    if (ctx.input.where) {
      sql += ` WHERE ${ctx.input.where}`;
    }

    ctx.info(
      `Updating rows in ${fullTableName}${ctx.input.where ? ` where ${ctx.input.where}` : ' (all rows)'}`
    );
    let result = await client.query(sql, ctx.config.queryTimeout);

    return {
      output: {
        affectedRows: result.affectedRows
      },
      message: `Updated **${result.affectedRows}** row(s) in \`${ctx.input.tableName}\`.`
    };
  })
  .build();
