import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient, stringField } from '../lib/client';
import { spec } from '../spec';

export let manageRetlSync = SlateTool.create(spec, {
  name: 'Manage Reverse ETL Sync',
  key: 'manage_retl_sync',
  description: `Trigger, stop, or check the status of a Reverse ETL sync. Reverse ETL routes customer data from your data warehouse to downstream destinations.
Use this to programmatically orchestrate syncs, check sync progress, or halt running syncs.`,
  tags: {
    destructive: true,
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
      startedAfter: z
        .string()
        .optional()
        .describe('Filter syncs started after this UTC ISO 8601 date-time.'),
      startedBefore: z
        .string()
        .optional()
        .describe('Filter syncs started before this UTC ISO 8601 date-time.'),
      limit: z.number().optional().describe('Max syncs to return (for list action)'),
      offset: z.number().optional().describe('Number of syncs to skip (for list action)')
    })
  )
  .output(
    z.object({
      nextOffset: z
        .number()
        .optional()
        .describe('Offset for the next results window, preserving filters.'),
      hasMore: z.boolean().optional().describe('Whether later sync results are available.'),
      syncId: z.string().optional().describe('ID of the sync'),
      syncStatus: z.string().optional().describe('Current status of the sync'),
      syncs: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of syncs (for list action)'),
      metrics: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Sync metrics (for status action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({ token: ctx.auth.token, region: ctx.config.region });
    let { action, connectionId, syncType, syncId } = ctx.input;
    if (action === 'start') {
      let sync = await client.triggerRetlSync(connectionId, syncType ?? 'incremental');
      return {
        output: { syncId: stringField(sync.syncId, 'the sync ID'), success: true },
        message: 'Accepted the sync start request. Poll its status to verify completion.'
      };
    }
    if (action === 'stop') {
      await client.stopRetlSync(connectionId);
      return {
        output: { success: true },
        message:
          'Accepted the stop request. Poll the owned sync to confirm its terminal status.'
      };
    }
    if (action === 'status') {
      if (!syncId) throw createApiServiceError('Sync ID is required for status.');
      let sync = await client.getRetlSyncStatus(connectionId, syncId);
      return {
        output: {
          syncId: stringField(sync.id, 'the sync ID'),
          syncStatus: stringField(sync.status, 'the sync status'),
          metrics: isApiErrorRecord(sync.metrics) ? sync.metrics : undefined,
          success: true
        },
        message: 'Retrieved the sync status.'
      };
    }
    let result = await client.listRetlSyncs(connectionId, ctx.input);
    return {
      output: { ...result, success: true },
      message: `Retrieved ${result.syncs.length} sync(s). Use offset to read later results.`
    };
  })
  .build();
