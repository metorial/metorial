import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { postgresServiceError } from '../lib/errors';
import {
  createClient,
  escapeIdentifier,
  escapeLiteral,
  qualifiedTableName
} from '../lib/helpers';
import { spec } from '../spec';

export let updateRows = SlateTool.create(spec, {
  name: 'Update Rows',
  key: 'update_rows',
  description: `Update rows in a PostgreSQL table based on a WHERE condition. Specify the columns to update and their new values.
Supports returning updated rows and allows complex WHERE conditions.`,
  instructions: [
    'Always specify a WHERE condition to avoid unintended full-table updates.',
    'Values are automatically escaped to prevent SQL injection.'
  ],
  constraints: ['If no WHERE condition is provided, all rows in the table will be updated.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table to update'),
      schemaName: z.string().optional().describe('Schema containing the table'),
      set: z
        .record(z.string(), z.any())
        .describe('Object of column names and their new values'),
      where: z
        .string()
        .optional()
        .describe(
          'SQL WHERE condition (without the WHERE keyword). Example: "id = 1 AND status = \'active\'"'
        ),
      returning: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to return the updated rows using RETURNING *')
    })
  )
  .output(
    z.object({
      updatedCount: z.number().describe('Number of rows updated'),
      returnedRows: z
        .array(z.record(z.string(), z.any()))
        .describe('Updated rows (if returning was enabled)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let schema = ctx.input.schemaName || ctx.config.defaultSchema;
    let fullTableName = qualifiedTableName(ctx.input.tableName, schema);

    let setClauses = Object.entries(ctx.input.set).map(([col, val]) => {
      let sqlVal: string;
      if (val === null || val === undefined) sqlVal = 'NULL';
      else if (typeof val === 'number') sqlVal = String(val);
      else if (typeof val === 'boolean') sqlVal = val ? 'TRUE' : 'FALSE';
      else if (typeof val === 'object') sqlVal = escapeLiteral(JSON.stringify(val));
      else sqlVal = escapeLiteral(String(val));
      return `${escapeIdentifier(col)} = ${sqlVal}`;
    });

    if (setClauses.length === 0) {
      throw postgresServiceError(
        'At least one column must be specified in the "set" parameter'
      );
    }

    let sql = `UPDATE ${fullTableName} SET ${setClauses.join(', ')}`;

    if (ctx.input.where) {
      sql += ` WHERE ${ctx.input.where}`;
    }

    if (ctx.input.returning) {
      sql += ' RETURNING *';
    }

    ctx.info(
      `Updating rows in ${fullTableName}${ctx.input.where ? ` where ${ctx.input.where}` : ''}`
    );
    let result = await client.query(sql, ctx.config.queryTimeout);

    return {
      output: {
        updatedCount: result.rowCount ?? 0,
        returnedRows: result.rows
      },
      message: `Updated **${result.rowCount ?? 0}** row(s) in \`${ctx.input.tableName}\`.`
    };
  })
  .build();
