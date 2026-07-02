import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageConnections = SlateTool.create(spec, {
  name: 'Manage Connections',
  key: 'manage_connections',
  description: `List, inspect, update, enable/disable, sync, or delete data source connections. Connections synchronize documents from external services like Google Drive, Notion, Confluence, and Salesforce.
Use this to manage the lifecycle of your data source integrations.`,
  instructions: [
    'Use action "list" to see all connections.',
    'Use action "get" to inspect a specific connection.',
    'Use action "get_stats" to see document count statistics for a connection.',
    'Use action "update" to modify connection settings (applies on next sync).',
    'Use action "enable" or "disable" to toggle syncing.',
    'Use action "sync" to trigger a manual synchronization.',
    'Use action "delete" to remove a connection. Set keepFiles to true to retain documents.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'get_stats', 'update', 'enable', 'disable', 'sync', 'delete'])
        .describe('Action to perform'),
      connectionId: z
        .string()
        .optional()
        .describe('Connection ID (required for all actions except "list")'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Connection metadata to update (for "update" action)'),
      partitionStrategy: z
        .string()
        .optional()
        .describe('Partition strategy to set (for "update" action)'),
      keepFiles: z
        .boolean()
        .optional()
        .describe('Whether to retain documents when deleting a connection')
    })
  )
  .output(
    z.object({
      connections: z
        .array(
          z.object({
            connectionId: z.string().describe('Connection ID'),
            name: z.string().describe('Connection name'),
            status: z.string().describe('Connection status'),
            sourceType: z.string().describe('Source type (e.g., google_drive, notion)'),
            partition: z.string().nullable().describe('Connection partition'),
            enabled: z.boolean().describe('Whether syncing is enabled'),
            createdAt: z.string().describe('ISO 8601 creation timestamp'),
            updatedAt: z.string().describe('ISO 8601 last update timestamp')
          })
        )
        .optional()
        .describe('List of connections'),
      connection: z
        .object({
          connectionId: z.string().describe('Connection ID'),
          name: z.string().describe('Connection name'),
          status: z.string().describe('Connection status'),
          sourceType: z.string().describe('Source type'),
          partition: z.string().nullable().describe('Connection partition'),
          enabled: z.boolean().describe('Whether syncing is enabled'),
          createdAt: z.string().describe('ISO 8601 creation timestamp'),
          updatedAt: z.string().describe('ISO 8601 last update timestamp')
        })
        .optional()
        .describe('Connection details'),
      stats: z.record(z.string(), z.any()).optional().describe('Connection statistics'),
      synced: z.boolean().optional().describe('Whether a sync was triggered'),
      deleted: z.boolean().optional().describe('Whether the connection was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      partition: ctx.config.partition
    });

    let mapConnection = (c: any) => ({
      connectionId: c.id,
      name: c.name,
      status: c.status,
      sourceType: c.sourceType,
      partition: c.partition,
      enabled: c.enabled,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    });

    switch (ctx.input.action) {
      case 'list': {
        let connections = await client.listConnections();
        return {
          output: {
            connections: connections.map(mapConnection)
          },
          message: `Found **${connections.length}** connections.`
        };
      }

      case 'get': {
        if (!ctx.input.connectionId) throw new Error('connectionId is required.');
        let conn = await client.getConnection(ctx.input.connectionId);
        return {
          output: {
            connection: mapConnection(conn)
          },
          message: `Connection **${conn.name}** (${conn.sourceType}), status: \`${conn.status}\`, enabled: ${conn.enabled}`
        };
      }

      case 'get_stats': {
        if (!ctx.input.connectionId) throw new Error('connectionId is required.');
        let stats = await client.getConnectionStats(ctx.input.connectionId);
        return {
          output: {
            stats
          },
          message: `Connection \`${ctx.input.connectionId}\` stats: ${JSON.stringify(stats)}`
        };
      }

      case 'update': {
        if (!ctx.input.connectionId) throw new Error('connectionId is required.');
        let updated = await client.updateConnection(ctx.input.connectionId, {
          partitionStrategy: ctx.input.partitionStrategy,
          metadata: ctx.input.metadata
        });
        return {
          output: {
            connection: mapConnection(updated)
          },
          message: `Connection \`${ctx.input.connectionId}\` updated. Changes apply on next sync.`
        };
      }

      case 'enable': {
        if (!ctx.input.connectionId) throw new Error('connectionId is required.');
        await client.setConnectionEnabled(ctx.input.connectionId, true);
        return {
          output: {},
          message: `Connection \`${ctx.input.connectionId}\` enabled.`
        };
      }

      case 'disable': {
        if (!ctx.input.connectionId) throw new Error('connectionId is required.');
        await client.setConnectionEnabled(ctx.input.connectionId, false);
        return {
          output: {},
          message: `Connection \`${ctx.input.connectionId}\` disabled.`
        };
      }

      case 'sync': {
        if (!ctx.input.connectionId) throw new Error('connectionId is required.');
        await client.syncConnection(ctx.input.connectionId);
        return {
          output: {
            synced: true
          },
          message: `Manual sync triggered for connection \`${ctx.input.connectionId}\`.`
        };
      }

      case 'delete': {
        if (!ctx.input.connectionId) throw new Error('connectionId is required.');
        await client.deleteConnection(ctx.input.connectionId, ctx.input.keepFiles);
        return {
          output: {
            deleted: true
          },
          message: `Connection \`${ctx.input.connectionId}\` deleted.${ctx.input.keepFiles ? ' Documents retained.' : ''}`
        };
      }
    }
  })
  .build();
