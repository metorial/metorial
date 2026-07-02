import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listSchemas = SlateTool.create(spec, {
  name: 'List Schemas',
  key: 'list_schemas',
  description: `List all schemas in the PostgreSQL database with their table counts and sizes.
Useful for exploring the database structure and understanding the organization of tables across schemas.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeSystemSchemas: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include system schemas (pg_catalog, information_schema, pg_toast)')
    })
  )
  .output(
    z.object({
      schemas: z
        .array(
          z.object({
            schemaName: z.string().describe('Name of the schema'),
            schemaOwner: z.string().describe('Owner of the schema'),
            tableCount: z.number().describe('Number of tables in the schema'),
            sizeFormatted: z
              .string()
              .nullable()
              .describe('Total size of all tables in the schema')
          })
        )
        .describe('List of schemas in the database'),
      totalCount: z.number().describe('Total number of schemas found')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let systemFilter = ctx.input.includeSystemSchemas
      ? ''
      : `WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast') AND n.nspname NOT LIKE 'pg_temp_%' AND n.nspname NOT LIKE 'pg_toast_temp_%'`;

    let sql = `
      SELECT
        n.nspname AS schema_name,
        pg_catalog.pg_get_userbyid(n.nspowner) AS schema_owner,
        COUNT(c.oid) FILTER (WHERE c.relkind IN ('r', 'p')) AS table_count,
        pg_size_pretty(COALESCE(SUM(pg_total_relation_size(c.oid)) FILTER (WHERE c.relkind IN ('r', 'p', 'm')), 0)) AS size_formatted
      FROM pg_catalog.pg_namespace n
      LEFT JOIN pg_catalog.pg_class c ON c.relnamespace = n.oid AND c.relkind IN ('r', 'p', 'm')
      ${systemFilter}
      GROUP BY n.nspname, n.nspowner
      ORDER BY n.nspname
    `;

    ctx.info('Listing database schemas');
    let result = await client.query(sql, ctx.config.queryTimeout);

    let schemas = result.rows.map((row: any) => ({
      schemaName: row.schema_name as string,
      schemaOwner: row.schema_owner as string,
      tableCount: Number(row.table_count),
      sizeFormatted: row.size_formatted as string | null
    }));

    return {
      output: {
        schemas,
        totalCount: schemas.length
      },
      message: `Found **${schemas.length}** schema(s) in the database.`
    };
  })
  .build();
