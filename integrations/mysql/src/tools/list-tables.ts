import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, escapeLiteral } from '../lib/helpers';
import { spec } from '../spec';

export let listTables = SlateTool.create(spec, {
  name: 'List Tables',
  key: 'list_tables',
  description: `List all tables in a MySQL database. Returns table names, types, engines, row estimates, and size information.
Also supports listing views.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseName: z
        .string()
        .optional()
        .describe(
          'Database to list tables from. If not specified, uses the connected database.'
        ),
      includeViews: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include views in the results')
    })
  )
  .output(
    z.object({
      tables: z
        .array(
          z.object({
            tableName: z.string().describe('Name of the table'),
            databaseName: z.string().describe('Database containing the table'),
            tableType: z.string().describe('Type of table (BASE TABLE, VIEW)'),
            engine: z.string().nullable().describe('Storage engine (InnoDB, MyISAM, etc.)'),
            estimatedRowCount: z.number().nullable().describe('Estimated number of rows'),
            dataSizeBytes: z.number().nullable().describe('Data size in bytes'),
            indexSizeBytes: z.number().nullable().describe('Index size in bytes'),
            tableCollation: z.string().nullable().describe('Table collation'),
            createTime: z.string().nullable().describe('When the table was created')
          })
        )
        .describe('List of tables in the database'),
      totalCount: z.number().describe('Total number of tables found')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let db = ctx.input.databaseName || ctx.auth.database || ctx.config.defaultDatabase || '';

    let typeFilter = ctx.input.includeViews
      ? `TABLE_TYPE IN ('BASE TABLE', 'VIEW')`
      : `TABLE_TYPE = 'BASE TABLE'`;

    let dbFilter = db
      ? `TABLE_SCHEMA = ${escapeLiteral(db)}`
      : `TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')`;

    let sql = `
      SELECT
        TABLE_NAME AS table_name,
        TABLE_SCHEMA AS database_name,
        TABLE_TYPE AS table_type,
        ENGINE AS engine,
        TABLE_ROWS AS estimated_row_count,
        DATA_LENGTH AS data_size_bytes,
        INDEX_LENGTH AS index_size_bytes,
        TABLE_COLLATION AS table_collation,
        CREATE_TIME AS create_time
      FROM INFORMATION_SCHEMA.TABLES
      WHERE ${dbFilter}
        AND ${typeFilter}
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;

    ctx.info(`Listing tables in ${db || '(all user databases)'}`);
    let result = await client.query(sql, ctx.config.queryTimeout);

    let tables = result.rows.map((row: any) => ({
      tableName: row.table_name as string,
      databaseName: row.database_name as string,
      tableType: row.table_type as string,
      engine: (row.engine as string) || null,
      estimatedRowCount:
        row.estimated_row_count != null ? Number(row.estimated_row_count) : null,
      dataSizeBytes: row.data_size_bytes != null ? Number(row.data_size_bytes) : null,
      indexSizeBytes: row.index_size_bytes != null ? Number(row.index_size_bytes) : null,
      tableCollation: (row.table_collation as string) || null,
      createTime: row.create_time != null ? String(row.create_time) : null
    }));

    return {
      output: {
        tables,
        totalCount: tables.length
      },
      message: `Found **${tables.length}** table(s) in ${db ? `database \`${db}\`` : 'the server'}.`
    };
  })
  .build();
