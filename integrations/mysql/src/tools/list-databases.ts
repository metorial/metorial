import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listDatabases = SlateTool.create(spec, {
  name: 'List Databases',
  key: 'list_databases',
  description: `List all databases on the MySQL server. Returns database names, default character sets, and collations.
Optionally includes system databases (information_schema, performance_schema, mysql, sys).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeSystemDatabases: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include system databases in the results')
    })
  )
  .output(
    z.object({
      databases: z
        .array(
          z.object({
            databaseName: z.string().describe('Name of the database'),
            defaultCharacterSet: z.string().describe('Default character set'),
            defaultCollation: z.string().describe('Default collation'),
            tableCount: z.number().describe('Number of tables in the database')
          })
        )
        .describe('List of databases on the server'),
      totalCount: z.number().describe('Total number of databases found')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let systemFilter = ctx.input.includeSystemDatabases
      ? ''
      : `WHERE s.SCHEMA_NAME NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')`;

    let sql = `
      SELECT
        s.SCHEMA_NAME AS database_name,
        s.DEFAULT_CHARACTER_SET_NAME AS default_character_set,
        s.DEFAULT_COLLATION_NAME AS default_collation,
        COUNT(t.TABLE_NAME) AS table_count
      FROM INFORMATION_SCHEMA.SCHEMATA s
      LEFT JOIN INFORMATION_SCHEMA.TABLES t
        ON t.TABLE_SCHEMA = s.SCHEMA_NAME
      ${systemFilter}
      GROUP BY s.SCHEMA_NAME, s.DEFAULT_CHARACTER_SET_NAME, s.DEFAULT_COLLATION_NAME
      ORDER BY s.SCHEMA_NAME
    `;

    ctx.info('Listing databases');
    let result = await client.query(sql, ctx.config.queryTimeout);

    let databases = result.rows.map((row: any) => ({
      databaseName: row.database_name as string,
      defaultCharacterSet: row.default_character_set as string,
      defaultCollation: row.default_collation as string,
      tableCount: Number(row.table_count)
    }));

    return {
      output: {
        databases,
        totalCount: databases.length
      },
      message: `Found **${databases.length}** database(s) on the server.`
    };
  })
  .build();
