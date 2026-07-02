import { SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

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
      tableName: z.string().optional().describe('Table name (for list_columns)')
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
        let connections = await client.listConnections();
        let mapped = (connections || []).map((c: any) => ({
          connectionName: c.name,
          host: c.host,
          port: c.port ? String(c.port) : undefined,
          database: c.database,
          dialectName: c.dialect_name,
          schema: c.schema
        }));
        return {
          output: { connections: mapped },
          message: `Found **${mapped.length}** database connection(s).`
        };
      }
      case 'get': {
        if (!ctx.input.connectionName) throw new Error('connectionName is required');
        let conn = await client.getConnection(ctx.input.connectionName);
        return {
          output: {
            connection: {
              connectionName: conn.name,
              host: conn.host,
              port: conn.port ? String(conn.port) : undefined,
              database: conn.database,
              dialectName: conn.dialect_name,
              schema: conn.schema,
              createdAt: conn.created_at,
              userAttributeFields: conn.user_attribute_fields
            }
          },
          message: `Retrieved connection **${conn.name}** (${conn.dialect_name}).`
        };
      }
      case 'test': {
        if (!ctx.input.connectionName) throw new Error('connectionName is required');
        let results = await client.testConnection(ctx.input.connectionName);
        let testResults = (results || []).map((r: any) => ({
          name: r.name,
          status: r.status,
          message: r.message
        }));
        let passed = testResults.filter((r: any) => r.status === 'success').length;
        return {
          output: { testResults },
          message: `Connection test for **${ctx.input.connectionName}**: ${passed}/${testResults.length} tests passed.`
        };
      }
      case 'list_schemas': {
        if (!ctx.input.connectionName) throw new Error('connectionName is required');
        let schemas = await client.connectionSchemas(ctx.input.connectionName, {
          database: ctx.input.database
        });
        let mapped = (schemas || []).map((s: any) => ({
          schemaName: s.name,
          isDefault: s.is_default
        }));
        return {
          output: { schemas: mapped },
          message: `Found **${mapped.length}** schema(s) in connection **${ctx.input.connectionName}**.`
        };
      }
      case 'list_tables': {
        if (!ctx.input.connectionName) throw new Error('connectionName is required');
        let tables = await client.connectionTables(ctx.input.connectionName, {
          database: ctx.input.database,
          schema_name: ctx.input.schemaName
        });
        let mapped = (tables || []).map((t: any) => ({
          tableName: t.name,
          schemaName: t.schema,
          rows: t.rows
        }));
        return {
          output: { tables: mapped },
          message: `Found **${mapped.length}** table(s)${ctx.input.schemaName ? ` in schema ${ctx.input.schemaName}` : ''}.`
        };
      }
      case 'list_columns': {
        if (!ctx.input.connectionName) throw new Error('connectionName is required');
        let columns = await client.connectionColumns(ctx.input.connectionName, {
          database: ctx.input.database,
          schema_name: ctx.input.schemaName,
          table_name: ctx.input.tableName
        });
        let mapped = (columns || []).map((c: any) => ({
          columnName: c.name,
          dataType: c.data_type,
          tableName: c.table_name,
          schemaName: c.schema_name
        }));
        return {
          output: { columns: mapped },
          message: `Found **${mapped.length}** column(s)${ctx.input.tableName ? ` in table ${ctx.input.tableName}` : ''}.`
        };
      }
    }
  })
  .build();
