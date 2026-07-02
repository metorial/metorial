import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, escapeLiteral } from '../lib/helpers';
import { spec } from '../spec';

export let describeTable = SlateTool.create(spec, {
  name: 'Describe Table',
  key: 'describe_table',
  description: `Get detailed schema information for a specific MySQL table, including columns, data types, constraints, indexes, and foreign keys.
Useful for understanding table structure before building queries or modifying schemas.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table to describe'),
      databaseName: z
        .string()
        .optional()
        .describe('Database containing the table. Defaults to the connected database.')
    })
  )
  .output(
    z.object({
      tableName: z.string().describe('Name of the described table'),
      databaseName: z.string().describe('Database of the described table'),
      engine: z.string().nullable().describe('Storage engine'),
      tableCollation: z.string().nullable().describe('Table collation'),
      estimatedRowCount: z.number().nullable().describe('Estimated number of rows'),
      columns: z
        .array(
          z.object({
            columnName: z.string().describe('Column name'),
            dataType: z.string().describe('Column data type'),
            columnType: z
              .string()
              .describe('Full column type (e.g., varchar(255), int unsigned)'),
            isNullable: z.boolean().describe('Whether the column allows NULL values'),
            defaultValue: z.string().nullable().describe('Default value expression'),
            isPrimaryKey: z
              .boolean()
              .describe('Whether this column is part of the primary key'),
            isAutoIncrement: z.boolean().describe('Whether the column auto-increments'),
            ordinalPosition: z.number().describe('Column position in the table')
          })
        )
        .describe('Column definitions'),
      indexes: z
        .array(
          z.object({
            indexName: z.string().describe('Name of the index'),
            isUnique: z.boolean().describe('Whether this is a unique index'),
            indexColumns: z.array(z.string()).describe('Columns included in the index'),
            indexType: z.string().describe('Index type (BTREE, HASH, FULLTEXT, SPATIAL)')
          })
        )
        .describe('Indexes on the table'),
      foreignKeys: z
        .array(
          z.object({
            constraintName: z.string().describe('Name of the foreign key constraint'),
            columnName: z.string().describe('Local column name'),
            referencedTable: z.string().describe('Referenced table'),
            referencedColumn: z.string().describe('Referenced column name'),
            referencedDatabase: z.string().describe('Referenced database')
          })
        )
        .describe('Foreign key relationships')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let db = ctx.input.databaseName || ctx.auth.database || ctx.config.defaultDatabase || '';
    let table = ctx.input.tableName;

    ctx.info(`Describing table: ${db}.${table}`);

    // Fetch table info
    let tableInfoResult = await client.query(
      `
      SELECT ENGINE, TABLE_COLLATION, TABLE_ROWS
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ${escapeLiteral(db)}
        AND TABLE_NAME = ${escapeLiteral(table)}
      LIMIT 1
    `,
      ctx.config.queryTimeout
    );

    let tableInfo = tableInfoResult.rows[0] as any;

    // Fetch columns
    let columnsResult = await client.query(
      `
      SELECT
        COLUMN_NAME AS column_name,
        DATA_TYPE AS data_type,
        COLUMN_TYPE AS column_type,
        IS_NULLABLE AS is_nullable,
        COLUMN_DEFAULT AS default_value,
        COLUMN_KEY AS column_key,
        EXTRA AS extra,
        ORDINAL_POSITION AS ordinal_position
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ${escapeLiteral(db)}
        AND TABLE_NAME = ${escapeLiteral(table)}
      ORDER BY ORDINAL_POSITION
    `,
      ctx.config.queryTimeout
    );

    // Fetch indexes
    let indexesResult = await client.query(
      `
      SELECT
        INDEX_NAME AS index_name,
        NON_UNIQUE AS non_unique,
        GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS index_columns,
        INDEX_TYPE AS index_type
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ${escapeLiteral(db)}
        AND TABLE_NAME = ${escapeLiteral(table)}
      GROUP BY INDEX_NAME, NON_UNIQUE, INDEX_TYPE
      ORDER BY INDEX_NAME
    `,
      ctx.config.queryTimeout
    );

    // Fetch foreign keys
    let fkResult = await client.query(
      `
      SELECT
        kcu.CONSTRAINT_NAME AS constraint_name,
        kcu.COLUMN_NAME AS column_name,
        kcu.REFERENCED_TABLE_NAME AS referenced_table,
        kcu.REFERENCED_COLUMN_NAME AS referenced_column,
        kcu.REFERENCED_TABLE_SCHEMA AS referenced_database
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
        AND tc.TABLE_NAME = kcu.TABLE_NAME
      WHERE tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
        AND kcu.TABLE_SCHEMA = ${escapeLiteral(db)}
        AND kcu.TABLE_NAME = ${escapeLiteral(table)}
      ORDER BY kcu.CONSTRAINT_NAME
    `,
      ctx.config.queryTimeout
    );

    let columns = columnsResult.rows.map((row: any) => ({
      columnName: row.column_name as string,
      dataType: row.data_type as string,
      columnType: row.column_type as string,
      isNullable: row.is_nullable === 'YES',
      defaultValue: row.default_value != null ? String(row.default_value) : null,
      isPrimaryKey: row.column_key === 'PRI',
      isAutoIncrement: String(row.extra || '').includes('auto_increment'),
      ordinalPosition: Number(row.ordinal_position)
    }));

    let indexes = indexesResult.rows.map((row: any) => ({
      indexName: row.index_name as string,
      isUnique: Number(row.non_unique) === 0,
      indexColumns: typeof row.index_columns === 'string' ? row.index_columns.split(',') : [],
      indexType: row.index_type as string
    }));

    let foreignKeys = fkResult.rows.map((row: any) => ({
      constraintName: row.constraint_name as string,
      columnName: row.column_name as string,
      referencedTable: row.referenced_table as string,
      referencedColumn: row.referenced_column as string,
      referencedDatabase: row.referenced_database as string
    }));

    return {
      output: {
        tableName: table,
        databaseName: db,
        engine: (tableInfo?.ENGINE as string) ?? null,
        tableCollation: (tableInfo?.TABLE_COLLATION as string) ?? null,
        estimatedRowCount: tableInfo?.TABLE_ROWS != null ? Number(tableInfo.TABLE_ROWS) : null,
        columns,
        indexes,
        foreignKeys
      },
      message: `Table \`${db}.${table}\` has **${columns.length}** column(s), **${indexes.length}** index(es), and **${foreignKeys.length}** foreign key(s).`
    };
  })
  .build();
