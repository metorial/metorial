import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { workspaceClient } from '../lib/client';
import { workspaceId } from '../lib/schemas';
import { spec } from '../spec';
export const cancelSyncRun = SlateTool.create(spec, {
  name: 'Cancel Sync Run',
  key: 'cancel_sync_run',
  description:
    'Requests cancellation of a queued or working sync run. Data already transferred remains in the destination; acceptance is not confirmation that execution has stopped. Check get_sync_runs afterward.',
  tags: { destructive: true }
})
  .input(
    z.object({
      workspaceId,
      syncRunId: z.number(),
      syncId: z.number().optional().describe('Optional parent-sync identity guard.')
    })
  )
  .output(
    z.object({ syncRunId: z.number(), syncId: z.number(), cancellationRequested: z.boolean() })
  )
  .handleInvocation(async ctx => {
    const client = await workspaceClient(ctx);
    const run = await client.getSyncRun(ctx.input.syncRunId);
    if (ctx.input.syncId !== undefined && run.syncId !== ctx.input.syncId)
      throw createApiServiceError('The run belongs to another sync.');
    if (!['queued', 'working'].includes(run.status))
      throw createApiServiceError(
        'Only a queued or working run can be canceled. Check its current status with get_sync_runs.'
      );
    await client.cancelSyncRun(run.id);
    return {
      output: { syncRunId: run.id, syncId: run.syncId, cancellationRequested: true },
      message: `Cancellation requested for run ${run.id}.`
    };
  })
  .build();
