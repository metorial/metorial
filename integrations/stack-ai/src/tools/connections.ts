import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConnections = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description: `List all connections in your organization. Connections represent integrations with external services like SharePoint, Salesforce, Slack, Google Drive, etc.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of connections to return'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      connections: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of connection objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let connections = await client.listConnections(ctx.input.limit, ctx.input.offset);

    return {
      output: {
        connections
      },
      message: `Retrieved **${connections.length}** connection(s).`
    };
  })
  .build();

export let getConnection = SlateTool.create(spec, {
  name: 'Get Connection',
  key: 'get_connection',
  description: `Retrieve details of a specific connection including its type, status, and configuration. Optionally check the connection's health status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('The ID of the connection to retrieve'),
      checkHealth: z.boolean().optional().describe('Also check the connection health status')
    })
  )
  .output(
    z.object({
      connection: z.record(z.string(), z.unknown()).describe('The connection details'),
      health: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Health check result, if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let connection = await client.getConnection(ctx.input.connectionId);
    let health: Record<string, unknown> | undefined;

    if (ctx.input.checkHealth) {
      health = await client.checkConnectionHealth(ctx.input.connectionId);
    }

    return {
      output: {
        connection,
        health
      },
      message: `Retrieved connection **${ctx.input.connectionId}**.${health ? ' Health check completed.' : ''}`
    };
  })
  .build();

export let deleteConnection = SlateTool.create(spec, {
  name: 'Delete Connection',
  key: 'delete_connection',
  description: `Remove a connection from your organization. This will disconnect the associated external service.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('The ID of the connection to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the connection was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    await client.deleteConnection(ctx.input.connectionId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted connection **${ctx.input.connectionId}**.`
    };
  })
  .build();

export let browseConnectionResources = SlateTool.create(spec, {
  name: 'Browse Connection Resources',
  key: 'browse_connection_resources',
  description: `Browse or search resources available through a connection. Useful for discovering files, folders, or data in connected external services like SharePoint or Google Drive.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('The ID of the connection to browse'),
      query: z
        .string()
        .optional()
        .describe('Search query to filter resources. If omitted, lists top-level resources')
    })
  )
  .output(
    z.object({
      resources: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of resources available through the connection')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let resources: Record<string, unknown>[];
    if (ctx.input.query) {
      resources = await client.searchConnectionResources(
        ctx.input.connectionId,
        ctx.input.query
      );
    } else {
      resources = await client.getConnectionResources(ctx.input.connectionId);
    }

    return {
      output: {
        resources
      },
      message: `Found **${resources.length}** resource(s) in connection **${ctx.input.connectionId}**.`
    };
  })
  .build();
