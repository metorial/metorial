import { SlateTool } from 'slates';
import { z } from 'zod';
import { RocketadminClient } from '../lib/client';
import { spec } from '../spec';

export let manageConnection = SlateTool.create(spec, {
  name: 'Manage Connection',
  key: 'manage_connection',
  description: `Create, update, test, or delete a database connection. Supports PostgreSQL, MySQL, MongoDB, MSSQL, Oracle, MariaDB, IBM Db2, ScyllaDB, and others. Use this to configure how Rocketadmin connects to your databases.`,
  instructions: [
    'For creating a connection, provide the action "create" along with connection details like type, host, port, database, username, and password.',
    'For testing, provide the connectionId and action "test" to verify the connection works.',
    'For deleting, provide the connectionId and action "delete".'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'test', 'delete'])
        .describe('Action to perform on the connection'),
      connectionId: z
        .string()
        .optional()
        .describe('Connection ID (required for update, test, delete)'),
      type: z
        .string()
        .optional()
        .describe('Database type: postgres, mysql, mongodb, mssql, oracledb, mariadb, ibmdb2'),
      host: z.string().optional().describe('Database host address'),
      port: z.number().optional().describe('Database port number'),
      database: z.string().optional().describe('Database name'),
      username: z.string().optional().describe('Database username'),
      password: z.string().optional().describe('Database password'),
      title: z.string().optional().describe('Display title for the connection'),
      ssl: z.boolean().optional().describe('Enable SSL for the connection'),
      sshHost: z
        .string()
        .optional()
        .describe('SSH tunnel host for connections behind firewalls'),
      sshPort: z.number().optional().describe('SSH tunnel port'),
      sshUsername: z.string().optional().describe('SSH tunnel username'),
      sshPassword: z.string().optional().describe('SSH tunnel password'),
      masterPassword: z
        .string()
        .optional()
        .describe('Master password for client-side encryption')
    })
  )
  .output(
    z.object({
      connectionId: z.string().optional().describe('ID of the connection'),
      success: z.boolean().describe('Whether the operation succeeded'),
      message: z.string().optional().describe('Status or error message'),
      connection: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full connection details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RocketadminClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      masterPassword: ctx.input.masterPassword
    });

    let { action, connectionId, masterPassword, ...params } = ctx.input;

    if (action === 'create') {
      let result = await client.createConnection(params);
      return {
        output: {
          connectionId: String(result.id || ''),
          success: true,
          connection: result
        },
        message: `Connection created successfully with ID **${result.id}**.`
      };
    }

    if (action === 'update') {
      if (!connectionId) throw new Error('connectionId is required for update');
      let result = await client.updateConnection(connectionId, params);
      return {
        output: {
          connectionId,
          success: true,
          connection: result
        },
        message: `Connection **${connectionId}** updated successfully.`
      };
    }

    if (action === 'test') {
      if (!connectionId) throw new Error('connectionId is required for test');
      let result = await client.testConnection(connectionId);
      return {
        output: {
          connectionId,
          success: true,
          message: 'Connection test successful',
          connection: result
        },
        message: `Connection **${connectionId}** test successful.`
      };
    }

    if (action === 'delete') {
      if (!connectionId) throw new Error('connectionId is required for delete');
      await client.deleteConnection(connectionId);
      return {
        output: {
          connectionId,
          success: true,
          message: 'Connection deleted'
        },
        message: `Connection **${connectionId}** deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
