import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createRocketadminClient, requiredString } from '../lib/client';
import { spec } from '../spec';

export let manageConnection = SlateTool.create(spec, {
  name: 'Manage Connection',
  key: 'manage_connection',
  description: `Get, create, update, test, or delete a database connection. Supports PostgreSQL, MySQL, MongoDB, MSSQL, Oracle, MariaDB, IBM Db2, ScyllaDB, and others. Use this to configure how Rocketadmin connects to your databases.`,
  instructions: [
    'For creating a connection, provide the action "create" along with connection details like type, host, port, database, username, and password.',
    'For testing, provide the connectionId and action "test". For saved SSH connections, resupply sshUsername and privateSSHKey because saved connection responses omit these credentials.',
    'For deleting, provide the connectionId and action "delete".',
    'Updating or testing SSH connections requires sshUsername and privateSSHKey; existing non-secret settings may be reused.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'test', 'delete', 'get'])
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
      sshUsername: z
        .string()
        .optional()
        .describe(
          'SSH tunnel username; resupply for updates/tests because saved responses omit it'
        ),
      sshPassword: z
        .string()
        .optional()
        .describe(
          'Legacy SSH password input; current Rocketadmin requires privateSSHKey instead'
        ),
      schema: z.string().optional().describe('Database schema, when applicable'),
      sid: z.string().optional().describe('Oracle SID, when applicable'),
      ssh: z
        .boolean()
        .optional()
        .describe(
          'Enable an SSH tunnel; inferred from sshHost for creation. Requires privateSSHKey, sshHost, sshPort, and sshUsername'
        ),
      privateSSHKey: z
        .string()
        .optional()
        .describe(
          'SSH private key for tunnel authentication; resupply for updates/tests because saved responses omit it'
        ),
      cert: z.string().optional().describe('TLS certificate when required by the database'),
      masterEncryption: z
        .boolean()
        .optional()
        .describe('Enable connection encryption with masterPassword'),
      authSource: z.string().optional().describe('MongoDB authentication database'),
      dataCenter: z.string().optional().describe('Database data center when applicable'),
      reason: z.string().optional().describe('Optional reason for deleting a connection'),
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
    let client = createRocketadminClient(ctx.auth, ctx.config, ctx.input.masterPassword);

    let { action, connectionId, masterPassword, reason, sshPassword, ...params } = ctx.input;
    if (sshPassword !== undefined)
      throw createApiServiceError(
        'Current Rocketadmin SSH tunnels require privateSSHKey; SSH password authentication is unsupported.'
      );
    for (let [name, value] of [
      ['port', params.port],
      ['sshPort', params.sshPort]
    ] as const) {
      if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > 65535)) {
        throw createApiServiceError(`${name} must be a whole number between 0 and 65535.`);
      }
    }
    if (
      (params.ssh === true || (params.ssh === undefined && Boolean(params.sshHost))) &&
      (!params.privateSSHKey ||
        !params.sshHost ||
        params.sshPort === undefined ||
        !params.sshUsername)
    ) {
      throw createApiServiceError(
        'SSH tunnels require privateSSHKey, sshHost, sshPort, and sshUsername. Saved responses omit SSH username/private key; supply them again for updates and tests.'
      );
    }

    if (action === 'get') {
      if (!connectionId)
        throw createApiServiceError(
          'connectionId is required. Call list_connections to discover IDs.'
        );
      let connection = await client.getConnection(connectionId);
      return {
        output: { connectionId, connection, success: true },
        message: `Retrieved connection **${connectionId}**.`
      };
    }
    if (action === 'create') {
      if (!params.type)
        throw createApiServiceError('type is required for creating a connection.');
      let result = await client.createConnection(params);
      let createdId = requiredString(result.id, 'created connection ID');
      return {
        output: {
          connectionId: createdId,
          success: true,
          connection: result
        },
        message: `Connection created successfully with ID **${result.id}**.`
      };
    }

    if (action === 'update') {
      if (!connectionId) throw createApiServiceError('connectionId is required for update');
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
      if (!connectionId) throw createApiServiceError('connectionId is required for test');
      let result = await client.testConnection(connectionId, params);
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
      if (!connectionId) throw createApiServiceError('connectionId is required for delete');
      await client.deleteConnection(connectionId, reason);
      return {
        output: {
          connectionId,
          success: true,
          message: 'Connection deleted'
        },
        message: `Connection **${connectionId}** deleted successfully.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
