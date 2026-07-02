import { SlateTool } from 'slates';
import { z } from 'zod';
import { FivetranClient } from '../lib/client';
import { spec } from '../spec';

let connectionSummarySchema = z.object({
  connectionId: z.string().describe('Unique identifier of the connection'),
  groupId: z.string().describe('Group this connection belongs to'),
  service: z.string().describe('Connector service type (e.g., "github", "salesforce")'),
  schema: z.string().optional().describe('Schema name in the destination'),
  paused: z.boolean().optional().describe('Whether the connection is paused'),
  setupState: z.string().optional().describe('Setup state: incomplete, connected, or broken'),
  syncState: z
    .string()
    .optional()
    .describe('Sync state: scheduled, syncing, paused, or rescheduled'),
  syncFrequency: z.number().optional().describe('Sync frequency in minutes'),
  succeededAt: z.string().optional().nullable().describe('Last successful sync timestamp'),
  failedAt: z.string().optional().nullable().describe('Last failed sync timestamp'),
  createdAt: z.string().optional().describe('Timestamp when the connection was created')
});

export let listConnections = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description: `List all connections (connectors) in the Fivetran account, or within a specific group. Returns summary information about each connection including its status, service type, and sync state.`
})
  .input(
    z.object({
      groupId: z
        .string()
        .optional()
        .describe('If provided, only list connections within this group')
    })
  )
  .output(
    z.object({
      connections: z.array(connectionSummarySchema).describe('List of connections')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);

    let items: any[];
    if (ctx.input.groupId) {
      items = await client.listGroupConnections(ctx.input.groupId);
    } else {
      items = await client.listConnections();
    }

    let connections = items.map((c: any) => ({
      connectionId: c.id,
      groupId: c.group_id,
      service: c.service,
      schema: c.schema,
      paused: c.paused,
      setupState: c.setup_state,
      syncState: c.sync_state,
      syncFrequency: c.sync_frequency,
      succeededAt: c.succeeded_at,
      failedAt: c.failed_at,
      createdAt: c.created_at
    }));

    return {
      output: { connections },
      message: `Found **${connections.length}** connection(s)${ctx.input.groupId ? ` in group ${ctx.input.groupId}` : ''}.`
    };
  })
  .build();
