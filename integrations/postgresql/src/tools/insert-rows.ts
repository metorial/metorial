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

export let insertRows = SlateTool.create(spec, {
  name: 'Insert Rows',
  key: 'insert_rows',
  description: `Insert one or more rows into a PostgreSQL table. Provide the data as an array of objects where keys are column names and values are the data to insert.
Supports inserting multiple rows in a single operation and can optionally return the inserted rows.`,
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
      schemaName: z.string().optional().describe('Schema containing the table'),
      rows: z
        .array(z.record(z.string(), z.any()))
        .min(1)
        .describe('Array of row objects to insert, where keys are column names'),
      returning: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to return the inserted rows using RETURNING *'),
      onConflict: z
        .enum(['error', 'ignore', 'update'])
        .optional()
        .default('error')
        .describe(
          'Behavior on unique constraint conflict: error (default), ignore (DO NOTHING), or update (DO UPDATE SET)'
        ),
      conflictColumns: z
        .array(z.string())
        .optional()
        .describe(
          'Columns that define the conflict target (required when onConflict is "ignore" or "update")'
        )
    })
  )
  .output(
    z.object({
      insertedCount: z.number().describe('Number of rows inserted'),
      returnedRows: z
        .array(z.record(z.string(), z.any()))
        .describe('Inserted rows (if returning was enabled)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let schema = ctx.input.schemaName || ctx.config.defaultSchema;
    let fullTableName = qualifiedTableName(ctx.input.tableName, schema);

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
      let values = columns.map(col => {
        let val = row[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'number') return String(val);
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'object') return escapeLiteral(JSON.stringify(val));
        return escapeLiteral(String(val));
      });
      valueClauses.push(`(${values.join(', ')})`);
    }

    let columnList = columns.map(escapeIdentifier).join(', ');
    let sql = `INSERT INTO ${fullTableName} (${columnList}) VALUES ${valueClauses.join(', ')}`;

    // Handle conflict
    if (ctx.input.onConflict === 'ignore') {
      let conflictTarget = ctx.input.conflictColumns?.length
        ? `(${ctx.input.conflictColumns.map(escapeIdentifier).join(', ')})`
        : '';
      sql += ` ON CONFLICT ${conflictTarget} DO NOTHING`;
    } else if (ctx.input.onConflict === 'update') {
      let conflictCols = ctx.input.conflictColumns;
      if (!conflictCols?.length) {
        throw postgresServiceError(
          'conflictColumns must be specified when onConflict is "update"'
        );
      }
      let conflictTarget = `(${conflictCols.map(escapeIdentifier).join(', ')})`;
      let updateCols = columns.filter(c => !conflictCols.includes(c));
      let setClauses = updateCols.map(
        c => `${escapeIdentifier(c)} = EXCLUDED.${escapeIdentifier(c)}`
      );
      if (setClauses.length > 0) {
        sql += ` ON CONFLICT ${conflictTarget} DO UPDATE SET ${setClauses.join(', ')}`;
      } else {
        sql += ` ON CONFLICT ${conflictTarget} DO NOTHING`;
      }
    }

    if (ctx.input.returning) {
      sql += ' RETURNING *';
    }

    ctx.info(`Inserting ${ctx.input.rows.length} row(s) into ${fullTableName}`);
    let result = await client.query(sql, ctx.config.queryTimeout);

    return {
      output: {
        insertedCount: result.rowCount ?? ctx.input.rows.length,
        returnedRows: result.rows
      },
      message: `Inserted **${result.rowCount ?? ctx.input.rows.length}** row(s) into \`${ctx.input.tableName}\`.`
    };
  })
  .build();
