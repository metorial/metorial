import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let manageDatabase = SlateTool.create(spec, {
  name: 'Manage Database',
  key: 'manage_database',
  description: `List, create, or delete databases. List databases across an organization or on a specific server with search and pagination. Create new databases with user credentials, or delete existing ones.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID'),
      action: z.enum(['list', 'create', 'destroy']).describe('Action to perform'),
      serverId: z
        .string()
        .optional()
        .describe('Server ID (required for create and destroy, optional filter for list)'),
      databaseId: z.string().optional().describe('Database ID (required for destroy)'),
      search: z.string().optional().describe('Search by database name (for list action)'),
      page: z.number().optional().describe('Page number for pagination (for list action)'),
      databaseName: z.string().optional().describe('Database name (for create action)'),
      username: z
        .string()
        .optional()
        .describe('Database username, min 5 alphanumeric chars (for create action)'),
      password: z
        .string()
        .optional()
        .describe('Database password, min 8 chars (for create action)'),
      connectionPreference: z
        .enum(['localhost', 'everywhere', 'specific_ip_addresses'])
        .optional()
        .describe('Connection preference (for create action)'),
      allowedIps: z
        .array(z.string())
        .optional()
        .describe('Allowed IPv4 addresses (for create with specific_ip_addresses)')
    })
  )
  .output(
    z.object({
      databases: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of databases'),
      pagination: z.record(z.string(), z.unknown()).optional().describe('Pagination info'),
      responseMessage: z.string().optional().describe('API response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw new Error('organizationId is required either in input or config');

    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listDatabases(orgId, {
        serverId: ctx.input.serverId,
        page: ctx.input.page,
        search: ctx.input.search
      });
      return {
        output: {
          databases: result.databases,
          pagination: result.pagination,
          responseMessage: undefined
        },
        message: `Found **${result.databases.length}** database(s).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.serverId) throw new Error('serverId is required for create action');
      if (!ctx.input.databaseName)
        throw new Error('databaseName is required for create action');
      if (!ctx.input.username) throw new Error('username is required for create action');
      if (!ctx.input.password) throw new Error('password is required for create action');

      let result = await client.createDatabase(orgId, ctx.input.serverId, {
        name: ctx.input.databaseName,
        username: ctx.input.username,
        password: ctx.input.password,
        connectionPreference: ctx.input.connectionPreference,
        hostname: ctx.input.allowedIps
      });
      return {
        output: {
          responseMessage:
            ((result as Record<string, unknown>).message as string) || 'Database created',
          databases: undefined,
          pagination: undefined
        },
        message: `Database **${ctx.input.databaseName}** created on server ${ctx.input.serverId}.`
      };
    }

    if (action === 'destroy') {
      if (!ctx.input.serverId) throw new Error('serverId is required for destroy action');
      if (!ctx.input.databaseId) throw new Error('databaseId is required for destroy action');

      let result = await client.destroyDatabase(
        orgId,
        ctx.input.serverId,
        ctx.input.databaseId
      );
      return {
        output: {
          responseMessage:
            ((result as Record<string, unknown>).message as string) || 'Database deleted',
          databases: undefined,
          pagination: undefined
        },
        message: `Database **${ctx.input.databaseId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
