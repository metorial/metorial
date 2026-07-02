import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';
import {
  ensureAtLeastOne,
  jsonObjectSchema,
  mapRun,
  pickDefined,
  requireString
} from './shared';

export let manageRun = SlateTool.create(spec, {
  name: 'Manage Run',
  key: 'manage_run',
  description: `Get or manage Apify Actor run lifecycle actions beyond cancellation, including resurrect, reboot, update, and delete.`,
  instructions: [
    'Use get_run for normal read-with-log/dataset retrieval.',
    'Use abort_run for cancellation.',
    'Use manage_run for resurrect, reboot, update, and delete lifecycle actions.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'resurrect', 'reboot', 'update', 'delete']).describe('Action'),
      runId: z.string().optional().describe('Actor run ID'),
      statusMessage: z.string().optional().describe('Run status message for update'),
      metadata: jsonObjectSchema.optional().describe('Run metadata for update')
    })
  )
  .output(
    z.object({
      runId: z.string().optional(),
      actorId: z.string().optional(),
      actorTaskId: z.string().optional(),
      status: z.string().optional(),
      startedAt: z.string().optional(),
      finishedAt: z.string().optional(),
      buildId: z.string().optional(),
      defaultDatasetId: z.string().optional(),
      defaultKeyValueStoreId: z.string().optional(),
      defaultRequestQueueId: z.string().optional(),
      usage: z.record(z.string(), z.any()).optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });
    let runId = requireString(ctx.input.runId, 'runId', ctx.input.action);

    if (ctx.input.action === 'get') {
      let run = await client.getRun(runId);
      return {
        output: mapRun(run),
        message: `Retrieved run \`${runId}\` with status **${run.status}**.`
      };
    }

    if (ctx.input.action === 'resurrect') {
      let run = await client.resurrectRun(runId);
      let output = mapRun(run);
      return {
        output,
        message: `Resurrected run \`${runId}\`. New status: **${output.status}**.`
      };
    }

    if (ctx.input.action === 'reboot') {
      let run = await client.rebootRun(runId);
      let output = mapRun(run);
      return {
        output,
        message: `Rebooted run \`${runId}\`. New status: **${output.status}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let body = pickDefined({
        statusMessage: ctx.input.statusMessage,
        metadata: ctx.input.metadata
      });
      ensureAtLeastOne(body, 'update the run');
      let run = await client.updateRun(runId, body);
      return {
        output: mapRun(run),
        message: `Updated run \`${runId}\`.`
      };
    }

    await client.deleteRun(runId);
    return {
      output: { runId, deleted: true },
      message: `Deleted run \`${runId}\`.`
    };
  })
  .build();
