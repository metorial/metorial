import { SlateTool } from 'slates';
import { z } from 'zod';
import { FivetranClient } from '../lib/client';
import { connectionId } from '../lib/schemas';
import { spec } from '../spec';

export let triggerSync = SlateTool.create(spec, {
  name: 'Trigger Sync',
  key: 'trigger_sync',
  description: `Request an incremental sync or a historical re-sync for a connection. Forced incremental sync addresses rescheduling; historical re-sync reloads source data and can incur additional costs.`,
  instructions: [
    'A regular sync pulls only new/changed data since the last sync.',
    'A force sync overrides rescheduling; it does not bypass a paused connection.',
    'A historical re-sync reloads all data from the source; use with caution as it may take significant time.'
  ]
})
  .input(
    z.object({
      connectionId: connectionId,
      force: z
        .boolean()
        .optional()
        .default(false)
        .describe('Force a sync when rescheduled; a paused connection must be resumed first'),
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
      await client.triggerResync(ctx.input.connectionId, ctx.input.resyncScope);
      return {
        output: { message: 'Historical re-sync request accepted.' },
        message: `Triggered historical re-sync for connection ${ctx.input.connectionId}.`
      };
    }

    await client.triggerSync(ctx.input.connectionId, ctx.input.force);
    return {
      output: { message: 'Sync request accepted.' },
      message: `Triggered sync for connection ${ctx.input.connectionId}${ctx.input.force ? ' (forced)' : ''}.`
    };
  })
  .build();
