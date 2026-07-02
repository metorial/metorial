import { SlateTool } from 'slates';
import { z } from 'zod';
import { NangoClient } from '../lib/client';
import { spec } from '../spec';

let syncSpecSchema = z.union([
  z.string().describe('Sync name'),
  z.object({
    name: z.string().describe('Sync name'),
    variant: z.string().optional().describe('Sync variant')
  })
]);

export let manageSync = SlateTool.create(spec, {
  name: 'Manage Sync',
  key: 'manage_sync',
  description: `Start, pause, trigger, or check the status of syncs. Syncs are scheduled functions that continuously pull data from external APIs into Nango's cache. Use **trigger** for a one-off execution, **start** to activate the schedule, **pause** to stop scheduling, or **status** to check current sync state.`,
  instructions: [
    'Omit connectionId to apply the operation to all applicable connections.',
    'For trigger, use reset option to clear checkpoints and re-fetch all data.',
    'For status, use syncs as a comma-separated string or "*" for all syncs.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['trigger', 'start', 'pause', 'status'])
        .describe('Sync operation to perform'),
      providerConfigKey: z.string().describe('The integration ID (unique key)'),
      syncs: z.array(syncSpecSchema).describe('Sync names or sync objects to operate on'),
      connectionId: z
        .string()
        .optional()
        .describe('Target a specific connection; omit to apply to all'),
      reset: z
        .boolean()
        .optional()
        .describe('Clear checkpoints and restart from scratch (trigger only)'),
      emptyCache: z
        .boolean()
        .optional()
        .describe('Delete cached records before triggering (requires reset, trigger only)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      syncStatuses: z
        .array(
          z.object({
            syncId: z.string(),
            status: z.string(),
            checkpoint: z.string().nullable(),
            finishedAt: z.string().nullable(),
            nextScheduledSyncAt: z.string().nullable(),
            frequency: z.string(),
            latestResult: z.object({
              added: z.number(),
              updated: z.number(),
              deleted: z.number()
            }),
            recordCount: z.record(z.string(), z.number())
          })
        )
        .optional()
        .describe('Sync statuses (only returned for status action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NangoClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, providerConfigKey, syncs, connectionId } = ctx.input;

    if (action === 'trigger') {
      let result = await client.triggerSync({
        provider_config_key: providerConfigKey,
        syncs,
        connection_id: connectionId,
        opts: {
          reset: ctx.input.reset,
          emptyCache: ctx.input.emptyCache
        }
      });
      return {
        output: { success: result.success },
        message: `Triggered sync(s) for integration **${providerConfigKey}**.`
      };
    }

    if (action === 'start') {
      let result = await client.startSync({
        provider_config_key: providerConfigKey,
        syncs,
        connection_id: connectionId
      });
      return {
        output: { success: result.success },
        message: `Started sync schedule for integration **${providerConfigKey}**.`
      };
    }

    if (action === 'pause') {
      let result = await client.pauseSync({
        provider_config_key: providerConfigKey,
        syncs,
        connection_id: connectionId
      });
      return {
        output: { success: result.success },
        message: `Paused sync schedule for integration **${providerConfigKey}**.`
      };
    }

    // status
    let syncNames = syncs.map(s => (typeof s === 'string' ? s : s.name)).join(',');
    let result = await client.getSyncStatus({
      provider_config_key: providerConfigKey,
      syncs: syncNames,
      connection_id: connectionId
    });
    return {
      output: {
        success: true,
        syncStatuses: result.syncs.map(s => ({
          syncId: s.id,
          status: s.status,
          checkpoint: s.checkpoint,
          finishedAt: s.finished_at,
          nextScheduledSyncAt: s.next_scheduled_sync_at,
          frequency: s.frequency,
          latestResult: s.latest_result,
          recordCount: s.record_count
        }))
      },
      message: `Retrieved status for **${result.syncs.length}** sync(s) on integration **${providerConfigKey}**.`
    };
  })
  .build();
