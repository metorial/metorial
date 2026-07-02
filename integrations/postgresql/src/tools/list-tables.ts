import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listTables = SlateTool.create(spec, {
  name: 'List Tables',
  key: 'list_tables',
  description: `List all tables in the PostgreSQL database, optionally filtered by schema. Returns table names, schemas, row estimates, and size information.
Also supports listing views and materialized views.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      schemaName: z
        .string()
        .optional()
        .describe(
          'Filter tables by schema name. If not specified, uses the default schema from config.'
        ),
      includeViews: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include views and materialized views in the results'),
      includeSystemTables: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include system tables from pg_catalog and information_schema')
    })
  )
  .output(
    z.object({
      tables: z
        .array(
          z.object({
            tableName: z.string().describe('Name of the table'),
            schemaName: z.string().describe('Schema containing the table'),
            tableType: z
              .string()
              .describe('Type of table (BASE TABLE, VIEW, MATERIALIZED VIEW)'),
            estimatedRowCount: z
              .number()
              .nullable()
              .describe('Estimated number of rows from pg_stat'),
            sizeBytes: z
              .number()
              .nullable()
              .describe('Table size in bytes including indexes and TOAST'),
            sizeFormatted: z.string().nullable().describe('Human-readable table size')
          })
        )
        .describe('List of tables in the database'),
      totalCount: z.number().describe('Total number of tables found')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let schema = ctx.input.schemaName || ctx.config.defaultSchema;

    let _typeFilter = `'BASE TABLE'`;
    if (ctx.input.includeViews) {
      _typeFilter = `'BASE TABLE', 'VIEW'`;
    }

    let schemaFilter = ctx.input.includeSystemTables
      ? ''
      : `AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')`;

    if (schema && !ctx.input.includeSystemTables) {
      schemaFilter = `AND n.nspname = '${schema.replace(/'/g, "''")}'`;
    }

    let sql = `
      SELECT
        c.relname AS table_name,
        n.nspname AS schema_name,
        CASE c.relkind
          WHEN 'r' THEN 'BASE TABLE'
          WHEN 'v' THEN 'VIEW'
          WHEN 'm' THEN 'MATERIALIZED VIEW'
          WHEN 'f' THEN 'FOREIGN TABLE'
          WHEN 'p' THEN 'PARTITIONED TABLE'
        END AS table_type,
        c.reltuples::bigint AS estimated_row_count,
        pg_total_relation_size(c.oid) AS size_bytes,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS size_formatted
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN (${ctx.input.includeViews ? "'r','v','m','p'" : "'r','p'"})
        ${schemaFilter}
      ORDER BY n.nspname, c.relname
    `;

    ctx.info(`Listing tables in schema: ${schema || '(all schemas)'}`);
    let result = await client.query(sql, ctx.config.queryTimeout);

    let tables = result.rows.map((row: any) => ({
      tableName: row.table_name as string,
      schemaName: row.schema_name as string,
      tableType: row.table_type as string,
      estimatedRowCount:
        row.estimated_row_count != null ? Number(row.estimated_row_count) : null,
      sizeBytes: row.size_bytes != null ? Number(row.size_bytes) : null,
      sizeFormatted: row.size_formatted as string | null
    }));

    return {
      output: {
        tables,
        totalCount: tables.length
      },
      message: `Found **${tables.length}** table(s) in ${schema ? `schema \`${schema}\`` : 'the database'}.`
    };
  })
  .build();
