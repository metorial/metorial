import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { mapRun } from '../lib/mappers';
import { spec } from '../spec';

export let getRunTool = SlateTool.create(spec, {
  name: 'Get Run',
  key: 'get_run',
  description: `Get detailed information about a specific Terraform run. Returns the run's current status, plan/apply details, timestamps, and whether it has changes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      runId: z.string().describe('The run ID (e.g., run-xxxxx)')
    })
  )
  .output(
    z.object({
      runId: z.string(),
      status: z.string(),
      message: z.string(),
      source: z.string(),
      isDestroy: z.boolean(),
      createdAt: z.string(),
      hasChanges: z.boolean(),
      autoApply: z.boolean(),
      planOnly: z.boolean(),
      statusTimestamps: z.object({
        plannedAt: z.string(),
        appliedAt: z.string(),
        erroredAt: z.string()
      }),
      workspaceId: z.string(),
      planId: z.string(),
      applyId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.getRun(ctx.input.runId);
    let run = mapRun(response.data);

    return {
      output: run,
      message: `Run **${run.runId}** — status: ${run.status}, has changes: ${run.hasChanges}, destroy: ${run.isDestroy}.`
    };
  })
  .build();
