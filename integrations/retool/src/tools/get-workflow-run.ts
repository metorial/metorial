import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let getWorkflowRun = SlateTool.create(spec, {
  name: 'Get Workflow Run',
  key: 'get_workflow_run',
  description: `Read an existing workflow run's status, workflow and trigger IDs, creation timestamp, and documented user-task details. This does not execute a workflow.`,
  constraints: ['Requires the relevant API token scope and support in this deployment.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      runId: z.string().describe('The ID of the workflow run to retrieve')
    })
  )
  .output(
    z.object({
      run: z
        .record(z.string(), z.any())
        .describe('Full workflow run details including status, timestamps, and output')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let result = await client.getWorkflowRun(ctx.input.runId);

    return {
      output: {
        run: result.data
      },
      message: `Retrieved workflow run \`${ctx.input.runId}\`.`
    };
  })
  .build();
