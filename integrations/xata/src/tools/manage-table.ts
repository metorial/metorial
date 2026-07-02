import { SlateTool } from 'slates';
import { z } from 'zod';
import { XataWorkspaceClient } from '../lib/client';
import { spec } from '../spec';

export let listTables = SlateTool.create(spec, {
  name: 'List Tables',
  key: 'list_tables',
  description: `List all tables in a database branch. Returns table names and optionally their column schemas.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branch: z.string().optional().describe('Branch name (defaults to config branch)')
    })
  )
  .output(
    z.object({
      tables: z
        .array(
          z.object({
            tableName: z.string().describe('Name of the table')
          })
        )
        .describe('List of tables in the branch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let branch = ctx.input.branch || ctx.config.branch;

    let result = await client.listTables(ctx.input.databaseName, branch);
    let tables = (result.tables || []).map((t: any) => ({
      tableName: t.name || t
    }));

    return {
      output: { tables },
      message: `Found **${tables.length}** table(s) in **${ctx.input.databaseName}:${branch}**.`
    };
  })
  .build();

export let createTable = SlateTool.create(spec, {
  name: 'Create Table',
  key: 'create_table',
  description: `Create a new table in a database branch.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branch: z.string().optional().describe('Branch name (defaults to config branch)'),
      tableName: z.string().describe('Name for the new table')
    })
  )
  .output(
    z.object({
      tableName: z.string().describe('Name of the created table'),
      status: z.string().describe('Creation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let branch = ctx.input.branch || ctx.config.branch;

    await client.createTable(ctx.input.databaseName, branch, ctx.input.tableName);

    return {
      output: {
        tableName: ctx.input.tableName,
        status: 'created'
      },
      message: `Created table **${ctx.input.tableName}** in **${ctx.input.databaseName}:${branch}**.`
    };
  })
  .build();

export let deleteTable = SlateTool.create(spec, {
  name: 'Delete Table',
  key: 'delete_table',
  description: `Delete a table and all its records from a database branch. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branch: z.string().optional().describe('Branch name (defaults to config branch)'),
      tableName: z.string().describe('Name of the table to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the table was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let branch = ctx.input.branch || ctx.config.branch;

    await client.deleteTable(ctx.input.databaseName, branch, ctx.input.tableName);

    return {
      output: { deleted: true },
      message: `Deleted table **${ctx.input.tableName}** from **${ctx.input.databaseName}:${branch}**.`
    };
  })
  .build();

export let getTableSchema = SlateTool.create(spec, {
  name: 'Get Table Schema',
  key: 'get_table_schema',
  description: `Get the schema (column definitions) of a specific table. Useful for understanding the structure of a table before querying or inserting data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branch: z.string().optional().describe('Branch name (defaults to config branch)'),
      tableName: z.string().describe('Name of the table')
    })
  )
  .output(
    z.object({
      tableName: z.string().describe('Name of the table'),
      columns: z
        .array(
          z.object({
            columnName: z.string().describe('Name of the column'),
            columnType: z
              .string()
              .describe(
                'Type of the column (e.g., string, int, float, bool, text, email, vector, file, link, datetime, json)'
              ),
            notNull: z.boolean().optional().describe('Whether the column is required'),
            defaultValue: z.any().optional().describe('Default value for the column'),
            unique: z
              .boolean()
              .optional()
              .describe('Whether the column has a unique constraint'),
            link: z.any().optional().describe('Link configuration if column type is "link"'),
            vector: z
              .any()
              .optional()
              .describe('Vector configuration if column type is "vector"')
          })
        )
        .describe('Column definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let branch = ctx.input.branch || ctx.config.branch;

    let result = await client.getTableColumns(
      ctx.input.databaseName,
      branch,
      ctx.input.tableName
    );
    let columns = (result.columns || []).map((col: any) => ({
      columnName: col.name,
      columnType: col.type,
      notNull: col.notNull,
      defaultValue: col.defaultValue,
      unique: col.unique,
      link: col.link,
      vector: col.vector
    }));

    return {
      output: {
        tableName: ctx.input.tableName,
        columns
      },
      message: `Table **${ctx.input.tableName}** has **${columns.length}** column(s).`
    };
  })
  .build();

export let addTableColumn = SlateTool.create(spec, {
  name: 'Add Table Column',
  key: 'add_table_column',
  description: `Add a new column to an existing table. Supports all Xata column types including string, int, float, bool, text, email, datetime, vector, link, file, and json.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branch: z.string().optional().describe('Branch name (defaults to config branch)'),
      tableName: z.string().describe('Name of the table'),
      columnName: z.string().describe('Name for the new column'),
      columnType: z
        .string()
        .describe(
          'Type of the column (e.g., "string", "int", "float", "bool", "text", "email", "datetime", "vector", "link", "file", "json")'
        ),
      notNull: z.boolean().optional().describe('Whether the column is required'),
      defaultValue: z.any().optional().describe('Default value for the column'),
      unique: z
        .boolean()
        .optional()
        .describe('Whether the column should have a unique constraint'),
      link: z
        .object({
          table: z.string().describe('Target table for the link')
        })
        .optional()
        .describe('Link configuration (required when columnType is "link")'),
      vector: z
        .object({
          dimension: z.number().describe('Vector dimension (2-10000)')
        })
        .optional()
        .describe('Vector configuration (required when columnType is "vector")')
    })
  )
  .output(
    z.object({
      columnName: z.string().describe('Name of the added column'),
      status: z.string().describe('Column creation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let branch = ctx.input.branch || ctx.config.branch;

    let column: any = {
      name: ctx.input.columnName,
      type: ctx.input.columnType
    };
    if (ctx.input.notNull !== undefined) column.notNull = ctx.input.notNull;
    if (ctx.input.defaultValue !== undefined) column.defaultValue = ctx.input.defaultValue;
    if (ctx.input.unique !== undefined) column.unique = ctx.input.unique;
    if (ctx.input.link) column.link = ctx.input.link;
    if (ctx.input.vector) column.vector = ctx.input.vector;

    await client.addColumn(ctx.input.databaseName, branch, ctx.input.tableName, column);

    return {
      output: {
        columnName: ctx.input.columnName,
        status: 'created'
      },
      message: `Added column **${ctx.input.columnName}** (${ctx.input.columnType}) to **${ctx.input.tableName}**.`
    };
  })
  .build();
