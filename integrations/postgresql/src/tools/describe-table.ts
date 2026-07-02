import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let describeTable = SlateTool.create(spec, {
  name: 'Describe Table',
  key: 'describe_table',
  description: `Get detailed schema information for a specific table, including columns, data types, constraints, indexes, and foreign keys.
Useful for understanding table structure before building queries or modifying schemas.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table to describe'),
      schemaName: z
        .string()
        .optional()
        .describe('Schema containing the table. Defaults to the configured default schema.')
    })
  )
  .output(
    z.object({
      tableName: z.string().describe('Name of the described table'),
      schemaName: z.string().describe('Schema of the described table'),
      columns: z
        .array(
          z.object({
            columnName: z.string().describe('Column name'),
            dataType: z.string().describe('PostgreSQL data type'),
            isNullable: z.boolean().describe('Whether the column allows NULL values'),
            defaultValue: z.string().nullable().describe('Default value expression'),
            maxLength: z
              .number()
              .nullable()
              .describe('Maximum character length for character types'),
            isPrimaryKey: z
              .boolean()
              .describe('Whether this column is part of the primary key'),
            ordinalPosition: z.number().describe('Column position in the table')
          })
        )
        .describe('Column definitions'),
      indexes: z
        .array(
          z.object({
            indexName: z.string().describe('Name of the index'),
            isUnique: z.boolean().describe('Whether this is a unique index'),
            isPrimary: z.boolean().describe('Whether this is the primary key index'),
            indexColumns: z.array(z.string()).describe('Columns included in the index'),
            indexType: z
              .string()
              .describe('Index access method (btree, hash, gin, gist, etc.)')
          })
        )
        .describe('Indexes on the table'),
      foreignKeys: z
        .array(
          z.object({
            constraintName: z.string().describe('Name of the foreign key constraint'),
            columnName: z.string().describe('Local column name'),
            referencedTable: z.string().describe('Referenced table (schema.table)'),
            referencedColumn: z.string().describe('Referenced column name')
          })
        )
        .describe('Foreign key relationships'),
      estimatedRowCount: z.number().nullable().describe('Estimated number of rows'),
      sizeFormatted: z.string().nullable().describe('Human-readable table size')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let schema = ctx.input.schemaName || ctx.config.defaultSchema;
    let table = ctx.input.tableName;

    ctx.info(`Describing table: ${schema}.${table}`);

    // Fetch columns
    let columnsResult = await client.query(
      `
      SELECT
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.ordinal_position,
        COALESCE(
          (SELECT true FROM information_schema.key_column_usage kcu
           JOIN information_schema.table_constraints tc
             ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
           WHERE tc.constraint_type = 'PRIMARY KEY'
             AND kcu.table_schema = c.table_schema
             AND kcu.table_name = c.table_name
             AND kcu.column_name = c.column_name
           LIMIT 1),
          false
        ) AS is_primary_key
      FROM information_schema.columns c
      WHERE c.table_schema = '${schema.replace(/'/g, "''")}'
        AND c.table_name = '${table.replace(/'/g, "''")}'
      ORDER BY c.ordinal_position
    `,
      ctx.config.queryTimeout
    );

    // Fetch indexes
    let indexesResult = await client.query(
      `
      SELECT
        i.relname AS index_name,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary,
        am.amname AS index_type,
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS index_columns
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_am am ON am.oid = i.relam
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = '${table.replace(/'/g, "''")}'
        AND n.nspname = '${schema.replace(/'/g, "''")}'
      GROUP BY i.relname, ix.indisunique, ix.indisprimary, am.amname
      ORDER BY i.relname
    `,
      ctx.config.queryTimeout
    );

    // Fetch foreign keys
    let fkResult = await client.query(
      `
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_schema || '.' || ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = '${schema.replace(/'/g, "''")}'
        AND tc.table_name = '${table.replace(/'/g, "''")}'
      ORDER BY tc.constraint_name
    `,
      ctx.config.queryTimeout
    );

    // Fetch size info
    let sizeResult = await client.query(
      `
      SELECT
        c.reltuples::bigint AS estimated_row_count,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS size_formatted
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = '${table.replace(/'/g, "''")}'
        AND n.nspname = '${schema.replace(/'/g, "''")}'
      LIMIT 1
    `,
      ctx.config.queryTimeout
    );

    let columns = columnsResult.rows.map((row: any) => ({
      columnName: row.column_name as string,
      dataType:
        row.udt_name === 'int4'
          ? 'integer'
          : row.udt_name === 'int8'
            ? 'bigint'
            : row.udt_name === 'int2'
              ? 'smallint'
              : row.udt_name === 'float4'
                ? 'real'
                : row.udt_name === 'float8'
                  ? 'double precision'
                  : row.udt_name === 'bool'
                    ? 'boolean'
                    : (row.data_type as string),
      isNullable: row.is_nullable === 'YES',
      defaultValue: row.column_default as string | null,
      maxLength:
        row.character_maximum_length != null ? Number(row.character_maximum_length) : null,
      isPrimaryKey: row.is_primary_key === true,
      ordinalPosition: Number(row.ordinal_position)
    }));

    let indexes = indexesResult.rows.map((row: any) => ({
      indexName: row.index_name as string,
      isUnique: row.is_unique === true,
      isPrimary: row.is_primary === true,
      indexColumns: Array.isArray(row.index_columns)
        ? row.index_columns
        : typeof row.index_columns === 'string'
          ? row.index_columns.replace(/[{}]/g, '').split(',')
          : [],
      indexType: row.index_type as string
    }));

    let foreignKeys = fkResult.rows.map((row: any) => ({
      constraintName: row.constraint_name as string,
      columnName: row.column_name as string,
      referencedTable: row.referenced_table as string,
      referencedColumn: row.referenced_column as string
    }));

    let sizeRow = sizeResult.rows[0] as any;

    return {
      output: {
        tableName: table,
        schemaName: schema,
        columns,
        indexes,
        foreignKeys,
        estimatedRowCount:
          sizeRow?.estimated_row_count != null ? Number(sizeRow.estimated_row_count) : null,
        sizeFormatted: (sizeRow?.size_formatted as string) ?? null
      },
      message: `Table \`${schema}.${table}\` has **${columns.length}** column(s), **${indexes.length}** index(es), and **${foreignKeys.length}** foreign key(s).`
    };
  })
  .build();
