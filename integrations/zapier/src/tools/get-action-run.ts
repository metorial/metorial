import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getActionRun = SlateTool.create(spec, {
  name: 'Get Action Run',
  key: 'get_action_run',
  description: `Retrieve the status, results, and errors for an asynchronous Zapier Action Run.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      actionRunId: z.string().describe('Action Run ID returned by Create Action Run')
    })
  )
  .output(
    z.object({
      actionRunId: z.string().describe('Action Run identifier'),
      status: z.string().describe('Run status, such as queued, running, success, or error'),
      type: z.string().describe('Zapier object type returned for the run'),
      results: z.any().optional().describe('Action result payload when available'),
      errors: z.array(z.any()).optional().describe('Action run errors when available'),
      run: z.any().describe('Raw Zapier Action Run data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getActionRun(ctx.input.actionRunId);
    let run = response.data;
    let actionRunId = run.runId || run.id || ctx.input.actionRunId;

    return {
      output: {
        actionRunId,
        status: run.status,
        type: run.type,
        results: run.results,
        errors: run.errors,
        run
      },
      message: `Action Run \`${actionRunId}\` is **${run.status}**.`
    };
  })
  .build();
