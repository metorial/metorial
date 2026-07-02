import { SlateTool } from 'slates';
import { z } from 'zod';
import { mysqlServiceError } from '../lib/errors';
import { createClient, escapeIdentifier, qualifiedTableName } from '../lib/helpers';
import { spec } from '../spec';

export let manageIndexes = SlateTool.create(spec, {
  name: 'Manage Indexes',
  key: 'manage_indexes',
  description: `Create or drop indexes on MySQL tables. Supports standard, unique, fulltext, and spatial indexes.
Useful for optimizing query performance by adding appropriate indexes.`,
  instructions: [
    'Choose the right index type for your query patterns: BTREE (default) for range queries, HASH for exact lookups, FULLTEXT for text search.',
    'Creating indexes on large tables may take significant time and temporarily impact performance.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'drop']).describe('Action to perform'),
      tableName: z.string().describe('Name of the table'),
      databaseName: z.string().optional().describe('Database containing the table'),
      indexName: z.string().describe('Name of the index'),

      // Create options
      columns: z
        .array(
          z.object({
            columnName: z.string().describe('Column name to include in the index'),
            length: z
              .number()
              .int()
              .positive()
              .optional()
              .describe('Prefix length for string columns'),
            order: z.enum(['ASC', 'DESC']).optional().describe('Sort order for the column')
          })
        )
        .optional()
        .describe('Columns to include in the index (required for create action)'),
      indexType: z
        .enum(['BTREE', 'HASH', 'FULLTEXT', 'SPATIAL'])
        .optional()
        .default('BTREE')
        .describe('Index type'),
      unique: z.boolean().optional().default(false).describe('Create a unique index')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation completed successfully'),
      executedSql: z.string().describe('The SQL statement that was executed')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let db = ctx.input.databaseName || ctx.auth.database || ctx.config.defaultDatabase;
    let fullTableName = qualifiedTableName(ctx.input.tableName, db);

    let sql: string;

    if (ctx.input.action === 'create') {
      if (!ctx.input.columns || ctx.input.columns.length === 0) {
        throw mysqlServiceError('Columns are required for creating an index');
      }

      let columnList = ctx.input.columns
        .map(col => {
          let part = escapeIdentifier(col.columnName);
          if (col.length) part += `(${col.length})`;
          if (col.order) part += ` ${col.order}`;
          return part;
        })
        .join(', ');

      let indexKind = '';
      if (ctx.input.indexType === 'FULLTEXT') {
        indexKind = 'FULLTEXT ';
      } else if (ctx.input.indexType === 'SPATIAL') {
        indexKind = 'SPATIAL ';
      } else if (ctx.input.unique) {
        indexKind = 'UNIQUE ';
      }

      sql = `CREATE ${indexKind}INDEX ${escapeIdentifier(ctx.input.indexName)} ON ${fullTableName} (${columnList})`;

      if (ctx.input.indexType === 'BTREE' || ctx.input.indexType === 'HASH') {
        sql += ` USING ${ctx.input.indexType}`;
      }
    } else {
      sql = `DROP INDEX ${escapeIdentifier(ctx.input.indexName)} ON ${fullTableName}`;
    }

    ctx.info(`Executing: ${sql}`);
    await client.query(sql, ctx.config.queryTimeout);

    let actionLabel = ctx.input.action === 'create' ? 'Created' : 'Dropped';

    return {
      output: {
        success: true,
        executedSql: sql
      },
      message: `${actionLabel} index \`${ctx.input.indexName}\` on \`${ctx.input.tableName}\`.`
    };
  })
  .build();
