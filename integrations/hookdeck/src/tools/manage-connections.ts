import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { hookdeckServiceError, requireHookdeckInput } from '../lib/errors';
import { spec } from '../spec';

let connectionSchema = z.object({
  connectionId: z.string().describe('Connection ID (prefixed with web_)'),
  teamId: z.string().describe('Team/project ID'),
  name: z.string().describe('Connection name'),
  description: z.string().nullable().optional().describe('Connection description'),
  sourceName: z.string().describe('Attached source name'),
  sourceId: z.string().describe('Attached source ID'),
  destinationName: z.string().describe('Attached destination name'),
  destinationId: z.string().describe('Attached destination ID'),
  rules: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Connection rules (filter, retry, transform, delay, deduplicate)'),
  pausedAt: z.string().nullable().optional().describe('Timestamp if paused'),
  disabledAt: z.string().nullable().optional().describe('Timestamp if disabled'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageConnections = SlateTool.create(spec, {
  name: 'Manage Connections',
  key: 'manage_connections',
  description: `Create, update, delete, list, enable, disable, pause, or unpause Hookdeck connections. A connection routes events from a source to a destination, optionally applying rules (filters, retries, transformations, delays, deduplication).`,
  instructions: [
    'When creating, provide either sourceId or an inline source object, and either destinationId or an inline destination object.',
    'Rules array supports types: retry, filter, transform, delay, deduplicate. Order in the array determines execution order.',
    'Connection IDs are prefixed with "web_" due to legacy naming.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'create',
          'update',
          'delete',
          'enable',
          'disable',
          'pause',
          'unpause'
        ])
        .describe('Action to perform'),
      connectionId: z
        .string()
        .optional()
        .describe('Connection ID (required for get, update, delete, pause, unpause)'),
      name: z.string().optional().describe('Connection name'),
      description: z.string().optional().describe('Connection description'),
      sourceId: z
        .string()
        .optional()
        .describe('Source ID to attach (for create or list filter)'),
      destinationId: z
        .string()
        .optional()
        .describe('Destination ID to attach (for create or list filter)'),
      sourceName: z
        .string()
        .optional()
        .describe('Create an inline source by name (alternative to sourceId)'),
      destinationName: z
        .string()
        .optional()
        .describe('Create an inline destination by name (alternative to destinationId)'),
      destinationUrl: z.string().optional().describe('URL for inline destination'),
      rules: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Connection rules array'),
      limit: z.number().optional().describe('Max results (for list)'),
      cursor: z.string().optional().describe('Pagination cursor (for list)')
    })
  )
  .output(
    z.object({
      connection: connectionSchema.optional().describe('Single connection'),
      connections: z.array(connectionSchema).optional().describe('List of connections'),
      deletedId: z.string().optional().describe('ID of the deleted connection'),
      nextCursor: z.string().optional().describe('Next pagination cursor'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });

    let mapConnection = (c: any) => {
      let src = (c.source || {}) as Record<string, unknown>;
      let dest = (c.destination || {}) as Record<string, unknown>;
      return {
        connectionId: c.id as string,
        teamId: c.team_id as string,
        name: c.name as string,
        description: (c.description as string | null) ?? null,
        sourceName: src.name as string,
        sourceId: src.id as string,
        destinationName: dest.name as string,
        destinationId: dest.id as string,
        rules: c.rules as Record<string, unknown>[] | undefined,
        pausedAt: (c.paused_at as string | null) ?? null,
        disabledAt: (c.disabled_at as string | null) ?? null,
        createdAt: c.created_at as string,
        updatedAt: c.updated_at as string
      };
    };

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listConnections({
          name: ctx.input.name,
          source_id: ctx.input.sourceId,
          destination_id: ctx.input.destinationId,
          limit: ctx.input.limit,
          next: ctx.input.cursor
        });
        return {
          output: {
            connections: result.models.map(c => mapConnection(c)),
            totalCount: result.count,
            nextCursor: result.pagination.next
          },
          message: `Listed **${result.models.length}** connections (${result.count} total).`
        };
      }
      case 'get': {
        let connectionId = requireHookdeckInput(ctx.input.connectionId, 'connectionId', 'get');
        let conn = await client.getConnection(connectionId);
        return {
          output: { connection: mapConnection(conn) },
          message: `Retrieved connection **${conn.name}** (\`${conn.id}\`).`
        };
      }
      case 'create': {
        let data: Record<string, unknown> = {};
        if (ctx.input.name) data.name = ctx.input.name;
        if (ctx.input.description) data.description = ctx.input.description;
        if (ctx.input.sourceId) {
          data.source_id = ctx.input.sourceId;
        } else if (ctx.input.sourceName) {
          data.source = { name: ctx.input.sourceName };
        }
        if (ctx.input.destinationId) {
          data.destination_id = ctx.input.destinationId;
        } else if (ctx.input.destinationName) {
          let destObj: Record<string, unknown> = { name: ctx.input.destinationName };
          if (ctx.input.destinationUrl) {
            destObj.config = { url: ctx.input.destinationUrl };
          }
          data.destination = destObj;
        }
        if (ctx.input.rules) data.rules = ctx.input.rules;

        if (!data.source_id && !data.source) {
          throw hookdeckServiceError('sourceId or sourceName is required for "create".');
        }

        if (!data.destination_id && !data.destination) {
          throw hookdeckServiceError(
            'destinationId or destinationName is required for "create".'
          );
        }

        let conn = await client.createConnection(data as any);
        return {
          output: { connection: mapConnection(conn) },
          message: `Created connection **${conn.name}** (\`${conn.id}\`) routing from **${conn.source.name}** to **${conn.destination.name}**.`
        };
      }
      case 'update': {
        let connectionId = requireHookdeckInput(
          ctx.input.connectionId,
          'connectionId',
          'update'
        );
        let conn = await client.updateConnection(connectionId, {
          name: ctx.input.name,
          description: ctx.input.description,
          rules: ctx.input.rules
        });
        return {
          output: { connection: mapConnection(conn) },
          message: `Updated connection **${conn.name}** (\`${conn.id}\`).`
        };
      }
      case 'delete': {
        let connectionId = requireHookdeckInput(
          ctx.input.connectionId,
          'connectionId',
          'delete'
        );
        let result = await client.deleteConnection(connectionId);
        return {
          output: { deletedId: result.id },
          message: `Deleted connection \`${result.id}\`.`
        };
      }
      case 'enable': {
        let connectionId = requireHookdeckInput(
          ctx.input.connectionId,
          'connectionId',
          'enable'
        );
        let conn = await client.enableConnection(connectionId);
        return {
          output: { connection: mapConnection(conn) },
          message: `Enabled connection **${conn.name}** (\`${conn.id}\`).`
        };
      }
      case 'disable': {
        let connectionId = requireHookdeckInput(
          ctx.input.connectionId,
          'connectionId',
          'disable'
        );
        let conn = await client.disableConnection(connectionId);
        return {
          output: { connection: mapConnection(conn) },
          message: `Disabled connection **${conn.name}** (\`${conn.id}\`).`
        };
      }
      case 'pause': {
        let connectionId = requireHookdeckInput(
          ctx.input.connectionId,
          'connectionId',
          'pause'
        );
        let conn = await client.pauseConnection(connectionId);
        return {
          output: { connection: mapConnection(conn) },
          message: `Paused connection **${conn.name}** (\`${conn.id}\`). Events will be queued.`
        };
      }
      case 'unpause': {
        let connectionId = requireHookdeckInput(
          ctx.input.connectionId,
          'connectionId',
          'unpause'
        );
        let conn = await client.unpauseConnection(connectionId);
        return {
          output: { connection: mapConnection(conn) },
          message: `Unpaused connection **${conn.name}** (\`${conn.id}\`). Queued events will begin delivery.`
        };
      }
    }
  })
  .build();
