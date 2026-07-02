import { SlateTool } from 'slates';
import { z } from 'zod';
import { FivetranClient } from '../lib/client';
import { spec } from '../spec';

export let triggerSync = SlateTool.create(spec, {
  name: 'Trigger Sync',
  key: 'trigger_sync',
  description: `Trigger a manual data sync for a connection. Optionally force a full re-sync to reload all historical data. Use this when you need data synced immediately instead of waiting for the scheduled sync.`,
  instructions: [
    'A regular sync pulls only new/changed data since the last sync.',
    'A force sync overrides any blocked or paused state.',
    'A historical re-sync reloads all data from the source; use with caution as it may take significant time.'
  ]
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the connection to sync'),
      force: z
        .boolean()
        .optional()
        .default(false)
        .describe('Force the sync even if the connection is paused or delayed'),
      historicalResync: z
        .boolean()
        .optional()
        .default(false)
        .describe('Perform a full historical re-sync instead of incremental'),
      resyncScope: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'For historical re-sync: scope to specific schemas/tables (e.g., {"schema_name": ["table1", "table2"]})'
        )
    })
  )
  .output(
    z.object({
      message: z.string().describe('Status message from Fivetran')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);

    if (ctx.input.historicalResync) {
      let result = await client.triggerResync(ctx.input.connectionId, ctx.input.resyncScope);
      return {
        output: { message: result?.message || 'Historical re-sync triggered.' },
        message: `Triggered historical re-sync for connection ${ctx.input.connectionId}.`
      };
    }

    let result = await client.triggerSync(ctx.input.connectionId, ctx.input.force);
    return {
      output: { message: result?.message || 'Sync triggered.' },
      message: `Triggered sync for connection ${ctx.input.connectionId}${ctx.input.force ? ' (forced)' : ''}.`
    };
  })
  .build();
