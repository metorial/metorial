import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  assertReadOnlySql,
  assertRows,
  ClickHouseDataClient,
  qualifiedTableName,
  validateIdentifier
} from '../lib/data-client';
import { spec } from '../spec';

let connectionSchema = z.object({
  endpoint: z
    .string()
    .describe(
      'ClickHouse HTTP(S) endpoint or host, for example https://example.clickhouse.cloud:8443'
    ),
  username: z.string().min(1).describe('Database username'),
  password: z.string().min(1).describe('Database password'),
  database: z
    .string()
    .optional()
    .describe('Optional default database for the query connection')
});

let queryResultSchema = z.object({
  raw: z.string().describe('Raw response body returned by ClickHouse'),
  parsed: z.any().optional().describe('Parsed JSON response when the response is JSON'),
  rows: z.array(z.any()).optional().describe('Parsed result rows when available'),
  columns: z.array(z.any()).optional().describe('Column metadata when available'),
  rowCount: z.number().optional().describe('Number of parsed rows when available'),
  statistics: z
    .record(z.string(), z.any())
    .optional()
    .describe('ClickHouse query statistics when returned by the selected format'),
  format: z.string().optional().describe('Requested ClickHouse output format')
});

let createDataClient = (input: z.infer<typeof connectionSchema>) =>
  new ClickHouseDataClient({
    endpoint: input.endpoint,
    username: input.username,
    password: input.password
  });

export let executeQuery = SlateTool.create(spec, {
  name: 'Execute Query',
  key: 'execute_query',
  description: `Execute a read-only SQL query against a ClickHouse service over the HTTP interface. Mutating statements are rejected; use insert_rows for inserts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    connectionSchema.extend({
      sql: z
        .string()
        .min(1)
        .describe('Read-only SQL statement to execute (SELECT, SHOW, DESCRIBE, or EXPLAIN)'),
      format: z
        .string()
        .optional()
        .describe(
          'ClickHouse output format. Defaults to JSON for parseable rows and columns.'
        ),
      maxRows: z
        .number()
        .int()
        .min(1)
        .max(10000)
        .optional()
        .describe('Maximum result rows ClickHouse should return. Defaults to 1000.')
    })
  )
  .output(queryResultSchema)
  .handleInvocation(async ctx => {
    assertReadOnlySql(ctx.input.sql);

    let client = createDataClient(ctx.input);
    let result = await client.query(ctx.input.sql, {
      database: ctx.input.database,
      format: ctx.input.format || 'JSON',
      maxRows: ctx.input.maxRows || 1000
    });

    return {
      output: result,
      message: `Executed read-only ClickHouse query with **${result.rowCount ?? 0}** parsed rows.`
    };
  })
  .build();

export let listDatabases = SlateTool.create(spec, {
  name: 'List Databases',
  key: 'list_databases',
  description: `List databases available to the supplied ClickHouse database user via the HTTP interface.`,
  tags: {
    readOnly: true
  }
})
  .input(connectionSchema.omit({ database: true }))
  .output(
    z.object({
      databases: z.array(
        z.object({
          name: z.string(),
          engine: z.string().optional(),
          uuid: z.string().optional()
        })
      ),
      raw: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createDataClient(ctx.input);
    let result = await client.query(
      'SELECT name, engine, uuid FROM system.databases ORDER BY name FORMAT JSON',
      { maxRows: 10000 }
    );
    let rows = Array.isArray(result.rows) ? result.rows : [];

    return {
      output: {
        databases: rows.map((row: any) => ({
          name: String(row.name),
          engine: row.engine,
          uuid: row.uuid
        })),
        raw: result.raw
      },
      message: `Found **${rows.length}** ClickHouse databases.`
    };
  })
  .build();

export let listTables = SlateTool.create(spec, {
  name: 'List Tables',
  key: 'list_tables',
  description: `List tables visible to the supplied ClickHouse database user, optionally scoped to one database.`,
  tags: {
    readOnly: true
  }
})
  .input(
    connectionSchema.extend({
      maxRows: z
        .number()
        .int()
        .min(1)
        .max(10000)
        .optional()
        .describe('Maximum tables to return. Defaults to 1000.')
    })
  )
  .output(
    z.object({
      tables: z.array(
        z.object({
          database: z.string(),
          name: z.string(),
          engine: z.string().optional(),
          totalRows: z.union([z.number(), z.string()]).nullable().optional(),
          totalBytes: z.union([z.number(), z.string()]).nullable().optional()
        })
      ),
      raw: z.string()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.database) validateIdentifier(ctx.input.database, 'database name');

    let maxRows = ctx.input.maxRows || 1000;
    let where = ctx.input.database ? 'WHERE database = {database:String}' : '';
    let client = createDataClient(ctx.input);
    let result = await client.query(
      `SELECT database, name, engine, total_rows, total_bytes FROM system.tables ${where} ORDER BY database, name LIMIT ${maxRows} FORMAT JSON`,
      {
        params: {
          param_database: ctx.input.database
        },
        maxRows
      }
    );
    let rows = Array.isArray(result.rows) ? result.rows : [];

    return {
      output: {
        tables: rows.map((row: any) => ({
          database: String(row.database),
          name: String(row.name),
          engine: row.engine,
          totalRows: row.total_rows,
          totalBytes: row.total_bytes
        })),
        raw: result.raw
      },
      message: `Found **${rows.length}** ClickHouse tables.`
    };
  })
  .build();

export let describeTable = SlateTool.create(spec, {
  name: 'Describe Table',
  key: 'describe_table',
  description: `Describe a ClickHouse table and return column metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    connectionSchema.extend({
      table: z.string().describe('Table name to describe')
    })
  )
  .output(
    z.object({
      table: z.string(),
      columns: z.array(
        z.object({
          name: z.string(),
          type: z.string(),
          defaultType: z.string().optional(),
          defaultExpression: z.string().optional(),
          comment: z.string().optional()
        })
      ),
      raw: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let table = qualifiedTableName(ctx.input.table, ctx.input.database);
    let client = createDataClient(ctx.input);
    let result = await client.query(`DESCRIBE TABLE ${table} FORMAT JSON`, {
      database: ctx.input.database,
      maxRows: 10000
    });
    let rows = Array.isArray(result.rows) ? result.rows : [];

    return {
      output: {
        table,
        columns: rows.map((row: any) => ({
          name: String(row.name),
          type: String(row.type),
          defaultType: row.default_type,
          defaultExpression: row.default_expression,
          comment: row.comment
        })),
        raw: result.raw
      },
      message: `Retrieved **${rows.length}** columns for ${table}.`
    };
  })
  .build();

export let insertRows = SlateTool.create(spec, {
  name: 'Insert Rows',
  key: 'insert_rows',
  description: `Insert JSON object rows into a ClickHouse table over the HTTP interface using FORMAT JSONEachRow.`,
  tags: {
    destructive: true
  }
})
  .input(
    connectionSchema.extend({
      table: z.string().describe('Destination table name'),
      rows: z
        .array(z.record(z.string(), z.any()))
        .min(1)
        .max(1000)
        .describe('Rows to insert as JSONEachRow objects')
    })
  )
  .output(
    z.object({
      insertedRows: z.number(),
      table: z.string()
    })
  )
  .handleInvocation(async ctx => {
    assertRows(ctx.input.rows);

    let client = createDataClient(ctx.input);
    let result = await client.insertJsonEachRow({
      database: ctx.input.database,
      table: ctx.input.table,
      rows: ctx.input.rows
    });

    return {
      output: result,
      message: `Inserted **${result.insertedRows}** rows into ${result.table}.`
    };
  })
  .build();
