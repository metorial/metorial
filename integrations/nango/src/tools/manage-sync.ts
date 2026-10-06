import { SlateTool } from 'slates';
import { clientFor } from '../lib/client';
import { connectionId, integrationId, invalid, syncSpec, text, z } from '../lib/schemas';
import { spec } from '../spec';
export const manageSync = SlateTool.create(spec, {
  name: 'Manage Sync',
  key: 'manage_sync',
  description:
    'Trigger, start, pause or inspect deployed syncs. Discover exact sync names with list_functions. Start executes immediately and enables scheduling; trigger queues a run, not a completed result. Pause affects scheduling and does not prove an active run was cancelled. Reset clears checkpoints; emptyCache also removes cached records. Provider side effects or execution history may remain.',
  instructions: [
    'Omitting connectionId applies to every applicable connection. An empty sync list applies to every sync for write actions; use explicit names to narrow the operation.',
    'For status, use ["*"] for all syncs. Variant selectors are encoded as name::variant. After uncertain writes inspect status before retrying.'
  ]
})
  .input(
    z.object({
      action: z.enum(['trigger', 'start', 'pause', 'status']),
      providerConfigKey: integrationId,
      syncs: z
        .array(syncSpec)
        .max(100)
        .describe(
          'Native names or name/variant objects from list_functions; an empty write list means all syncs.'
        ),
      connectionId: connectionId.optional(),
      reset: z.boolean().optional(),
      emptyCache: z.boolean().optional()
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      syncStatuses: z
        .array(
          z.object({
            syncId: text,
            status: text,
            checkpoint: z
              .unknown()
              .optional()
              .describe('Native checkpoint JSON, retained without flattening.'),
            finishedAt: z.string().nullish(),
            nextScheduledSyncAt: z.string().nullish(),
            frequency: z.string().optional(),
            latestResult: z
              .object({
                added: z.number().optional(),
                updated: z.number().optional(),
                deleted: z.number().optional()
              })
              .optional(),
            recordCount: z.record(z.string(), z.number()).optional(),
            name: z.string().optional(),
            variant: z.string().optional(),
            connectionId: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    const i = ctx.input;
    if (i.action !== 'trigger' && (i.reset !== undefined || i.emptyCache !== undefined))
      throw invalid('reset and emptyCache apply only to trigger.');
    if (i.emptyCache && !i.reset)
      throw invalid('emptyCache requires reset=true and deletes cached records.');
    if (i.action === 'status' && !i.syncs.length)
      throw invalid('Supply at least one sync selector for status, or ["*"] for all syncs.');
    const names = i.syncs.map(item =>
      typeof item === 'string' ? item : item.name + (item.variant ? '::' + item.variant : '')
    );
    if (names.some(name => name.includes(',')))
      throw invalid('Sync selectors cannot contain commas; supply distinct array entries.');
    const client = clientFor(ctx);
    if (i.action !== 'status') {
      const result = await client.manageSync(i.action, {
        provider_config_key: i.providerConfigKey,
        syncs: i.syncs,
        connection_id: i.connectionId,
        opts: i.action === 'trigger' ? { reset: i.reset, emptyCache: i.emptyCache } : undefined
      });
      return {
        output: result,
        message: result.success
          ? 'Nango accepted the sync operation. Inspect status for execution progress; retained effects may remain.'
          : 'Nango did not confirm the sync operation.'
      };
    }
    const result = await client.getSyncStatus({
      provider_config_key: i.providerConfigKey,
      syncs: names.join(','),
      connection_id: i.connectionId
    });
    if (i.connectionId && result.syncs.some(item => item.connection_id !== i.connectionId))
      throw invalid('The sync status receipt did not match the exact requested connection.');
    return {
      output: {
        success: true,
        syncStatuses: result.syncs.map(item => ({
          syncId: item.id,
          status: item.status,
          checkpoint: item.checkpoint,
          finishedAt: item.finishedAt,
          nextScheduledSyncAt: item.nextScheduledSyncAt,
          frequency: item.frequency,
          latestResult: item.latestResult,
          recordCount: item.recordCount,
          name: item.name,
          variant: item.variant,
          connectionId: item.connection_id
        }))
      },
      message: 'Retrieved current native sync state.'
    };
  })
  .build();
