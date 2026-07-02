import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let manageRetlSync = SlateTool.create(spec, {
  name: 'Manage Reverse ETL Sync',
  key: 'manage_retl_sync',
  description: `Trigger, stop, or check the status of a Reverse ETL sync. Reverse ETL routes customer data from your data warehouse to downstream destinations.
Use this to programmatically orchestrate syncs, check sync progress, or halt running syncs.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['start', 'stop', 'status', 'list'])
        .describe('Action to perform on the sync'),
      connectionId: z.string().describe('Reverse ETL connection ID'),
      syncType: z
        .enum(['incremental', 'full'])
        .optional()
        .describe('Sync type (required for start action)'),
      syncId: z.string().optional().describe('Sync ID (required for status action)'),
      status: z.string().optional().describe('Filter syncs by status (for list action)'),
      limit: z.number().optional().describe('Max syncs to return (for list action)'),
      offset: z.number().optional().describe('Number of syncs to skip (for list action)')
    })
  )
  .output(
    z.object({
      syncId: z.string().optional().describe('ID of the sync'),
      syncStatus: z.string().optional().describe('Current status of the sync'),
      syncs: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of syncs (for list action)'),
      metrics: z
        .record(z.string(), z.any())
        .optional()
        .describe('Sync metrics (for status action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let { action, connectionId, syncType, syncId } = ctx.input;

    if (action === 'start') {
      let type = syncType || 'incremental';
      let result = await client.triggerRetlSync(connectionId, type);
      let sync = result.sync || result;

      return {
        output: {
          syncId: sync.id,
          syncStatus: sync.status,
          success: true
        },
        message: `Started **${type}** Reverse ETL sync for connection \`${connectionId}\`${sync.id ? ` (sync: \`${sync.id}\`)` : ''}.`
      };
    }

    if (action === 'stop') {
      await client.stopRetlSync(connectionId);

      return {
        output: { success: true },
        message: `Stopped running sync for connection \`${connectionId}\`.`
      };
    }

    if (action === 'status') {
      if (!syncId) throw new Error('Sync ID is required for status action.');

      let result = await client.getRetlSyncStatus(connectionId, syncId);
      let sync = result.sync || result;

      return {
        output: {
          syncId: sync.id || syncId,
          syncStatus: sync.status,
          metrics: sync.metrics,
          success: true
        },
        message: `Sync \`${syncId}\` status: **${sync.status}**${sync.metrics ? ` — ${JSON.stringify(sync.metrics)}` : ''}.`
      };
    }

    if (action === 'list') {
      let result = await client.listRetlSyncs(connectionId, {
        status: ctx.input.status,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let list = result.syncs || result;

      return {
        output: {
          syncs: Array.isArray(list) ? list : [],
          success: true
        },
        message: `Found **${Array.isArray(list) ? list.length : 0}** sync(s) for connection \`${connectionId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
