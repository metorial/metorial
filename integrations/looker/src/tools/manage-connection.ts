import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

function optionalString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function optionalStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string');
}

function requireArray(value: unknown, action: string): unknown[] {
  if (!Array.isArray(value)) {
    throw createApiServiceError(`Looker returned an invalid response for ${action}.`, {
      reason: 'looker_connection_response_invalid'
    });
  }

  return value;
}

function requireConnectionName(connectionName: string | undefined) {
  if (connectionName) return connectionName;

  throw createApiServiceError('connectionName is required for this action', {
    reason: 'looker_connection_name_required'
  });
}

export let manageConnection = SlateTool.create(spec, {
  name: 'Manage Connection',
  key: 'manage_connection',
  description: `List database connections, get connection details, test connectivity, and explore database metadata (schemas, tables, columns). Use this to inspect what data sources are available and their structure.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'test', 'list_schemas', 'list_tables', 'list_columns'])
        .describe('Action to perform'),
      connectionName: z
        .string()
        .optional()
        .describe(
          'Connection name (required for get, test, list_schemas, list_tables, list_columns)'
        ),
      database: z
        .string()
        .optional()
        .describe('Database name (for list_schemas, list_tables, list_columns)'),
      schemaName: z
        .string()
        .optional()
        .describe('Schema name (for list_tables, list_columns)'),
      tableName: z.string().optional().describe('Exact table name (for list_columns)'),
      tests: z
        .array(z.string().min(1))
        .min(1)
        .optional()
        .describe('Connection test names to run (for test); omit to run all supported tests'),
      useCache: z
        .boolean()
        .optional()
        .describe(
          'Whether to use cached metadata (for list_schemas, list_tables, list_columns)'
        ),
      tableFilter: z
        .string()
        .optional()
        .describe('Return tables whose names contain this value (for list_tables)'),
      tableLimit: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Maximum tables to return per schema (for list_tables, list_columns)')
    })
  )
  .output(
    z.object({
      connections: z
        .array(
          z.object({
            connectionName: z.string().describe('Connection name'),
            host: z.string().optional().describe('Database host'),
            port: z.string().optional().describe('Database port'),
            database: z.string().optional().describe('Default database'),
            dialectName: z.string().optional().describe('SQL dialect name'),
            schema: z.string().optional().describe('Default schema')
          })
        )
        .optional()
        .describe('List of connections'),
      connection: z
        .object({
          connectionName: z.string().describe('Connection name'),
          host: z.string().optional().describe('Database host'),
          port: z.string().optional().describe('Database port'),
          database: z.string().optional().describe('Default database'),
          dialectName: z.string().optional().describe('SQL dialect name'),
          schema: z.string().optional().describe('Default schema'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          userAttributeFields: z.array(z.string()).optional().describe('User attribute fields')
        })
        .optional()
        .describe('Connection details'),
      testResults: z
        .array(
          z.object({
            name: z.string().optional().describe('Test name'),
            status: z.string().optional().describe('Test status'),
            message: z.string().optional().describe('Test result message')
          })
        )
        .optional()
        .describe('Connection test results'),
      schemas: z
        .array(
          z.object({
            schemaName: z.string().describe('Schema name'),
            isDefault: z.boolean().optional().describe('Whether this is the default schema')
          })
        )
        .optional()
        .describe('List of schemas'),
      tables: z
        .array(
          z.object({
            tableName: z.string().describe('Table name'),
            schemaName: z.string().optional().describe('Schema name'),
            rows: z.number().optional().describe('Approximate row count')
          })
        )
        .optional()
        .describe('List of tables'),
      columns: z
        .array(
          z.object({
            columnName: z.string().describe('Column name'),
            dataType: z.string().optional().describe('Data type'),
            tableName: z.string().optional().describe('Table name'),
            schemaName: z.string().optional().describe('Schema name')
          })
        )
        .optional()
        .describe('List of columns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'list': {
        let connections = requireArray(await client.listConnections(), 'list connections');
        let mapped = connections.flatMap((connection: any) => {
          let connectionName = optionalString(connection?.name);
          if (!connectionName) return [];

          return [
            {
              connectionName,
              host: optionalString(connection.host),
              port: connection.port == null ? undefined : String(connection.port),
              database: optionalString(connection.database),
              dialectName: optionalString(connection.dialect_name),
              schema: optionalString(connection.schema)
            }
          ];
        });
        return {
          output: { connections: mapped },
          message: `Found **${mapped.length}** database connection(s).`
        };
      }
      case 'get': {
        let connectionName = requireConnectionName(ctx.input.connectionName);
        let conn = await client.getConnection(connectionName);
        return {
          output: {
            connection: {
              connectionName: optionalString(conn.name) ?? connectionName,
              host: optionalString(conn.host),
              port: conn.port == null ? undefined : String(conn.port),
              database: optionalString(conn.database),
              dialectName: optionalString(conn.dialect_name),
              schema: optionalString(conn.schema),
              createdAt: optionalString(conn.created_at),
              userAttributeFields: optionalStringArray(conn.user_attribute_fields)
            }
          },
          message: `Retrieved connection **${optionalString(conn.name) ?? connectionName}**${conn.dialect_name ? ` (${conn.dialect_name})` : ''}.`
        };
      }
      case 'test': {
        let connectionName = requireConnectionName(ctx.input.connectionName);
        let results = requireArray(
          await client.testConnection(connectionName, { tests: ctx.input.tests }),
          'test a connection'
        );
        let testResults = results.map((result: any) => ({
          name: optionalString(result?.name),
          status: optionalString(result?.status),
          message: optionalString(result?.message)
        }));
        let passed = testResults.filter((r: any) => r.status === 'success').length;
        return {
          output: { testResults },
          message: `Connection test for **${connectionName}**: ${passed}/${testResults.length} tests passed.`
        };
      }
      case 'list_schemas': {
        let connectionName = requireConnectionName(ctx.input.connectionName);
        let schemas = requireArray(
          await client.connectionSchemas(connectionName, {
            database: ctx.input.database,
            cache: ctx.input.useCache
          }),
          'list connection schemas'
        );
        let mapped = schemas.flatMap((schema: any) => {
          let schemaName = optionalString(schema?.name);
          if (!schemaName) return [];

          return [
            {
              schemaName,
              isDefault: typeof schema.is_default === 'boolean' ? schema.is_default : undefined
            }
          ];
        });
        return {
          output: { schemas: mapped },
          message: `Found **${mapped.length}** schema(s) in connection **${connectionName}**.`
        };
      }
      case 'list_tables': {
        let connectionName = requireConnectionName(ctx.input.connectionName);
        let schemaTables = requireArray(
          await client.connectionTables(connectionName, {
            database: ctx.input.database,
            schema_name: ctx.input.schemaName,
            cache: ctx.input.useCache,
            table_filter: ctx.input.tableFilter,
            table_limit: ctx.input.tableLimit
          }),
          'list connection tables'
        );
        let mapped = schemaTables.flatMap((schema: any) =>
          (Array.isArray(schema?.tables) ? schema.tables : []).flatMap((table: any) => {
            let tableName = optionalString(table.name);
            if (!tableName) return [];

            return [
              {
                tableName,
                schemaName: optionalString(table.schema_name) ?? optionalString(schema.name),
                rows: typeof table.rows === 'number' ? table.rows : undefined
              }
            ];
          })
        );
        return {
          output: { tables: mapped },
          message: `Found **${mapped.length}** table(s)${ctx.input.schemaName ? ` in schema ${ctx.input.schemaName}` : ''}.`
        };
      }
      case 'list_columns': {
        let connectionName = requireConnectionName(ctx.input.connectionName);
        let schemaColumns = requireArray(
          await client.connectionColumns(connectionName, {
            database: ctx.input.database,
            schema_name: ctx.input.schemaName,
            cache: ctx.input.useCache,
            table_limit: ctx.input.tableLimit,
            table_names: ctx.input.tableName
          }),
          'list connection columns'
        );
        let mapped = schemaColumns.flatMap((table: any) =>
          (Array.isArray(table?.columns) ? table.columns : []).flatMap((column: any) => {
            let columnName = optionalString(column.name);
            if (!columnName) return [];

            return [
              {
                columnName,
                dataType: optionalString(column.data_type),
                tableName: optionalString(table.name),
                schemaName:
                  optionalString(column.schema_name) ?? optionalString(table.schema_name)
              }
            ];
          })
        );
        return {
          output: { columns: mapped },
          message: `Found **${mapped.length}** column(s)${ctx.input.tableName ? ` in table ${ctx.input.tableName}` : ''}.`
        };
      }
    }
  })
  .build();
