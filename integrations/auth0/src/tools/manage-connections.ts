import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { auth0ServiceError, requireField } from '../lib/errors';
import { spec } from '../spec';

export let manageConnectionsTool = SlateTool.create(spec, {
  name: 'Manage Connections',
  key: 'manage_connections',
  description: `Create, update, delete, or list identity provider connections. Connections define how users authenticate — database, social (Google, Facebook), enterprise (SAML, OIDC), or passwordless (SMS, email).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      connectionId: z
        .string()
        .optional()
        .describe('Connection ID (required for get, update, delete)'),
      name: z.string().optional().describe('Connection name (required for create)'),
      strategy: z
        .string()
        .optional()
        .describe(
          'Connection strategy, e.g., "auth0", "google-oauth2", "samlp" (required for create)'
        ),
      options: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Connection-specific options'),
      enabledClients: z
        .array(z.string())
        .optional()
        .describe('Client IDs that can use this connection'),
      metadata: z.record(z.string(), z.string()).optional().describe('Connection metadata'),
      strategyFilter: z.string().optional().describe('Filter by strategy (for list action)'),
      page: z.number().optional().describe('Page number (for list action)'),
      perPage: z.number().optional().describe('Results per page (for list action)')
    })
  )
  .output(
    z.object({
      connection: z
        .object({
          connectionId: z.string(),
          name: z.string(),
          strategy: z.string(),
          enabledClients: z.array(z.string()).optional()
        })
        .optional()
        .describe('Connection details'),
      connections: z
        .array(
          z.object({
            connectionId: z.string(),
            name: z.string(),
            strategy: z.string(),
            enabledClients: z.array(z.string()).optional()
          })
        )
        .optional()
        .describe('List of connections'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let mapConn = (c: any) => ({
      connectionId: c.id,
      name: c.name,
      strategy: c.strategy,
      enabledClients: c.enabled_clients
    });

    if (ctx.input.action === 'list') {
      let result = await client.listConnections({
        strategy: ctx.input.strategyFilter,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let connections = (Array.isArray(result) ? result : (result.connections ?? [])).map(
        mapConn
      );
      return {
        output: { connections },
        message: `Found **${connections.length}** connection(s).`
      };
    }

    if (ctx.input.action === 'get') {
      let connectionId = requireField(ctx.input.connectionId, 'connectionId', 'get');
      let conn = await client.getConnection(connectionId);
      return {
        output: { connection: mapConn(conn) },
        message: `Retrieved connection **${conn.name}** (${conn.strategy}).`
      };
    }

    if (ctx.input.action === 'create') {
      let name = requireField(ctx.input.name, 'name', 'create');
      let strategy = requireField(ctx.input.strategy, 'strategy', 'create');
      let conn = await client.createConnection({
        name,
        strategy,
        options: ctx.input.options,
        enabledClients: ctx.input.enabledClients,
        metadata: ctx.input.metadata
      });
      return {
        output: { connection: mapConn(conn) },
        message: `Created connection **${conn.name}** with strategy "${conn.strategy}".`
      };
    }

    if (ctx.input.action === 'update') {
      let connectionId = requireField(ctx.input.connectionId, 'connectionId', 'update');
      let conn = await client.updateConnection(connectionId, {
        options: ctx.input.options,
        enabledClients: ctx.input.enabledClients,
        metadata: ctx.input.metadata
      });
      return {
        output: { connection: mapConn(conn) },
        message: `Updated connection **${conn.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      let connectionId = requireField(ctx.input.connectionId, 'connectionId', 'delete');
      await client.deleteConnection(connectionId);
      return {
        output: { deleted: true },
        message: `Deleted connection **${connectionId}**.`
      };
    }

    throw auth0ServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
