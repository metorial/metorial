import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnowflakeClient } from '../lib/client';
import { spec } from '../spec';

let columnDefinition = z.object({
  name: z.string().describe('Column name'),
  datatype: z
    .string()
    .describe('Snowflake data type (e.g. VARCHAR, NUMBER(10,2), BOOLEAN, TIMESTAMP_NTZ)'),
  nullable: z.boolean().optional().describe('Whether the column allows NULL values'),
  defaultValue: z.string().optional().describe('Default value expression for the column'),
  comment: z.string().optional().describe('Column comment')
});

export let manageTable = SlateTool.create(spec, {
  name: 'Manage Table',
  key: 'manage_table',
  description: `Create, retrieve, list, or delete tables within a Snowflake database and schema. When creating, define columns with their data types. For complex table alterations, use the Execute SQL tool with ALTER TABLE statements.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'delete']).describe('Operation to perform'),
      databaseName: z.string().describe('Database containing the table'),
      schemaName: z.string().describe('Schema containing the table'),
      tableName: z
        .string()
        .optional()
        .describe('Table name (required for get, create, delete)'),
      like: z.string().optional().describe('SQL LIKE pattern to filter tables when listing'),
      showLimit: z
        .number()
        .optional()
        .describe('Maximum number of tables to return when listing'),
      createMode: z
        .enum(['errorIfExists', 'orReplace', 'ifNotExists'])
        .optional()
        .describe('Creation behavior for create action'),
      columns: z
        .array(columnDefinition)
        .optional()
        .describe('Column definitions for creating a table'),
      comment: z.string().optional().describe('Table comment'),
      clusterBy: z
        .array(z.string())
        .optional()
        .describe('Clustering key columns for the table'),
      dataRetentionTimeInDays: z
        .number()
        .optional()
        .describe('Time Travel retention period in days'),
      kind: z.enum(['transient', 'permanent', 'temporary']).optional().describe('Table type'),
      ifExists: z
        .boolean()
        .optional()
        .describe('When true, delete succeeds even if the table does not exist')
    })
  )
  .output(
    z.object({
      tables: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of tables (for list action)'),
      table: z
        .record(z.string(), z.any())
        .optional()
        .describe('Table details (for get/create actions)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the table was deleted (for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnowflakeClient({
      accountIdentifier: ctx.config.accountIdentifier,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let { action, databaseName, schemaName, tableName } = ctx.input;

    if (action === 'list') {
      let tables = await client.listTables(databaseName, schemaName, {
        like: ctx.input.like,
        showLimit: ctx.input.showLimit
      });
      return {
        output: { tables },
        message: `Found **${tables.length}** table(s) in **${databaseName}.${schemaName}**`
      };
    }

    if (!tableName) {
      throw new Error('tableName is required for get, create, and delete actions');
    }

    if (action === 'get') {
      let table = await client.getTable(databaseName, schemaName, tableName);
      return {
        output: { table },
        message: `Retrieved table **${databaseName}.${schemaName}.${tableName}**`
      };
    }

    if (action === 'create') {
      if (!ctx.input.columns || ctx.input.columns.length === 0) {
        throw new Error('At least one column definition is required to create a table');
      }

      let body: Record<string, any> = {
        name: tableName,
        columns: ctx.input.columns.map(col => {
          let colDef: Record<string, any> = {
            name: col.name,
            datatype: col.datatype
          };
          if (col.nullable !== undefined) colDef.nullable = col.nullable;
          if (col.defaultValue) colDef.default = col.defaultValue;
          if (col.comment) colDef.comment = col.comment;
          return colDef;
        })
      };

      if (ctx.input.comment) body.comment = ctx.input.comment;
      if (ctx.input.clusterBy) body.cluster_by = ctx.input.clusterBy;
      if (ctx.input.dataRetentionTimeInDays !== undefined)
        body.data_retention_time_in_days = ctx.input.dataRetentionTimeInDays;
      if (ctx.input.kind) body.kind = ctx.input.kind;

      let table = await client.createTable(
        databaseName,
        schemaName,
        body,
        ctx.input.createMode
      );
      return {
        output: { table },
        message: `Created table **${databaseName}.${schemaName}.${tableName}** with ${ctx.input.columns.length} column(s)`
      };
    }

    if (action === 'delete') {
      await client.deleteTable(databaseName, schemaName, tableName, ctx.input.ifExists);
      return {
        output: { deleted: true },
        message: `Deleted table **${databaseName}.${schemaName}.${tableName}**`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
