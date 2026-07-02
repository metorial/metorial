import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let triggerSync = SlateTool.create(spec, {
  name: 'Trigger Sync',
  key: 'trigger_sync',
  description: `Programmatically triggers a sync run. By default, performs an incremental sync. Set forceFullSync to true to force a complete resync of all records.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      syncId: z.number().describe('ID of the sync to trigger.'),
      forceFullSync: z
        .boolean()
        .optional()
        .describe('Force a full sync instead of incremental. Resyncs all records from source.')
    })
  )
  .output(
    z.object({
      syncRunId: z.number().describe('ID of the triggered sync run.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.triggerSync(ctx.input.syncId, ctx.input.forceFullSync);

    return {
      output: {
        syncRunId: result.syncRunId
      },
      message: `Triggered ${ctx.input.forceFullSync ? 'full' : 'incremental'} sync run for sync **${ctx.input.syncId}** (run ID: ${result.syncRunId}).`
    };
  })
  .build();
