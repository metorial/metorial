import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

export let getRunFailureDetailsTool = SlateTool.create(spec, {
  name: 'Get Run Failure Details',
  key: 'get_run_failure_details',
  description: `Retrieve retry-related failure details for a failed dbt Cloud run, including the failed step and skipped steps when available.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...accountIdInput,
      runId: z.string().describe('The failed run ID to inspect')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('Run that was inspected'),
      failedStep: z.string().nullable().optional().describe('Step that failed'),
      skippedSteps: z.array(z.string()).optional().describe('Steps skipped after failure'),
      details: z.any().optional().describe('Raw failure details returned by dbt Cloud')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    let details = await client.getRunFailureDetails(ctx.input.runId);

    return {
      output: {
        runId: ctx.input.runId,
        failedStep: details.failed_step ?? null,
        skippedSteps: details.skipped_steps,
        details
      },
      message: `Retrieved failure details for run #${ctx.input.runId}.`
    };
  })
  .build();
