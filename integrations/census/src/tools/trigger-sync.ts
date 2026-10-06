import { SlateTool } from 'slates';
import { z } from 'zod';
import { workspaceClient } from '../lib/client';
import { workspaceId } from '../lib/schemas';
import { spec } from '../spec';

export let triggerSync = SlateTool.create(spec, {
  name: 'Trigger Sync',
  key: 'trigger_sync',
  description: `Requests a sync run; acceptance does not mean completion. The run can query a warehouse, transfer data, incur costs and delete destination records in mirror mode. By default, performs an incremental sync. Set forceFullSync to true to force a complete resync of all records.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workspaceId,
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
    let client = await workspaceClient(ctx);

    let result = await client.triggerSync(ctx.input.syncId, ctx.input.forceFullSync);

    return {
      output: {
        syncRunId: result.syncRunId
      },
      message: `Triggered ${ctx.input.forceFullSync ? 'full' : 'incremental'} sync run for sync **${ctx.input.syncId}** (run ID: ${result.syncRunId}).`
    };
  })
  .build();
