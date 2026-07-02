import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  createClient,
  escapeIdentifier,
  formatValue,
  qualifiedTableName
} from '../lib/helpers';
import { spec } from '../spec';

export let insertRows = SlateTool.create(spec, {
  name: 'Insert Rows',
  key: 'insert_rows',
  description: `Insert one or more rows into a MySQL table. Provide the data as an array of objects where keys are column names and values are the data to insert.
Supports inserting multiple rows in a single operation and handling duplicate key conflicts.`,
  instructions: [
    'Column names in the row objects must exactly match the table column names.',
    'Values are automatically escaped to prevent SQL injection.',
    'Use null for NULL values.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table to insert into'),
      databaseName: z.string().optional().describe('Database containing the table'),
      rows: z
        .array(z.record(z.string(), z.any()))
        .min(1)
        .describe('Array of row objects to insert, where keys are column names'),
      onDuplicateKey: z
        .enum(['error', 'ignore', 'update'])
        .optional()
        .default('error')
        .describe(
          'Behavior on duplicate key: error (default), ignore (INSERT IGNORE), or update (ON DUPLICATE KEY UPDATE)'
        ),
      updateColumns: z
        .array(z.string())
        .optional()
        .describe(
          'Columns to update on duplicate key (required when onDuplicateKey is "update"). If not specified, all non-key columns are updated.'
        )
    })
  )
  .output(
    z.object({
      affectedRows: z.number().describe('Number of rows affected by the insert'),
      lastInsertId: z.number().describe('Last auto-increment insert ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let db = ctx.input.databaseName || ctx.auth.database || ctx.config.defaultDatabase;
    let fullTableName = qualifiedTableName(ctx.input.tableName, db);

    // Collect all unique column names from all rows
    let columnSet = new Set<string>();
    for (let row of ctx.input.rows) {
      for (let key of Object.keys(row)) {
        columnSet.add(key);
      }
    }
    let columns = Array.from(columnSet);

    // Build values list
    let valueClauses: string[] = [];
    for (let row of ctx.input.rows) {
      let values = columns.map(col => formatValue(row[col]));
      valueClauses.push(`(${values.join(', ')})`);
    }

    let columnList = columns.map(escapeIdentifier).join(', ');
    let insertKeyword = ctx.input.onDuplicateKey === 'ignore' ? 'INSERT IGNORE' : 'INSERT';
    let sql = `${insertKeyword} INTO ${fullTableName} (${columnList}) VALUES ${valueClauses.join(', ')}`;

    if (ctx.input.onDuplicateKey === 'update') {
      let updateCols = ctx.input.updateColumns || columns;
      let setClauses = updateCols.map(
        c => `${escapeIdentifier(c)} = VALUES(${escapeIdentifier(c)})`
      );
      if (setClauses.length > 0) {
        sql += ` ON DUPLICATE KEY UPDATE ${setClauses.join(', ')}`;
      }
    }

    ctx.info(`Inserting ${ctx.input.rows.length} row(s) into ${fullTableName}`);
    let result = await client.query(sql, ctx.config.queryTimeout);

    return {
      output: {
        affectedRows: result.affectedRows,
        lastInsertId: result.lastInsertId
      },
      message: `Inserted into \`${ctx.input.tableName}\`. **${result.affectedRows}** row(s) affected. Last insert ID: **${result.lastInsertId}**.`
    };
  })
  .build();
