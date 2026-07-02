import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let triggerSync = SlateTool.create(spec, {
  name: 'Trigger Sync',
  key: 'trigger_sync',
  description: `Trigger a sync to run on demand. You can trigger by sync ID or slug. Optionally perform a full resync (ignoring previously synced rows) or reset CDC state. Useful for integrating Hightouch into data pipelines and orchestration workflows.`,
  instructions: [
    'Provide either syncId or syncSlug to identify the sync, not both.',
    'Set fullResync to true to re-sync all rows regardless of previous state.',
    'Set resetCdc to true to sync all rows without executing changes on the destination.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      syncId: z.number().optional().describe('ID of the sync to trigger'),
      syncSlug: z
        .string()
        .optional()
        .describe('Slug of the sync to trigger (alternative to syncId)'),
      fullResync: z
        .boolean()
        .optional()
        .describe('Whether to resync all rows, ignoring previously synced rows'),
      resetCdc: z
        .boolean()
        .optional()
        .describe('Whether to sync all rows without executing changes on the destination')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('ID of the triggered sync run')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: { id: string };

    if (ctx.input.syncId && !ctx.input.syncSlug) {
      result = await client.triggerSync(ctx.input.syncId, {
        fullResync: ctx.input.fullResync,
        resetCDC: ctx.input.resetCdc
      });
    } else {
      result = await client.triggerSyncByIdOrSlug({
        syncId: ctx.input.syncId?.toString(),
        syncSlug: ctx.input.syncSlug,
        fullResync: ctx.input.fullResync,
        resetCDC: ctx.input.resetCdc
      });
    }

    return {
      output: { runId: result.id },
      message: `Triggered sync run (run ID: ${result.id}).${ctx.input.fullResync ? ' Full resync requested.' : ''}`
    };
  })
  .build();

export let triggerSyncSequence = SlateTool.create(spec, {
  name: 'Trigger Sync Sequence',
  key: 'trigger_sync_sequence',
  description: `Trigger a sync sequence to run on demand. A sync sequence is an ordered group of syncs that run in a specific order. Returns the sequence run ID for monitoring.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      syncSequenceId: z.string().describe('ID of the sync sequence to trigger')
    })
  )
  .output(
    z.object({
      sequenceRunId: z.string().describe('ID of the triggered sequence run')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.triggerSyncSequence(ctx.input.syncSequenceId);

    return {
      output: { sequenceRunId: result.id },
      message: `Triggered sync sequence run (sequence run ID: ${result.id}).`
    };
  })
  .build();
