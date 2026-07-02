import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWorkflowRun = SlateTool.create(spec, {
  name: 'Get Workflow Run',
  key: 'get_workflow_run',
  description: `Retrieve details of a specific workflow run, including its status, duration, and output. Useful for monitoring and debugging workflow executions.`,
  constraints: ['Available on Enterprise Base plan and above.'],
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
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.getWorkflowRun(ctx.input.runId);

    return {
      output: {
        run: result.data
      },
      message: `Retrieved workflow run \`${ctx.input.runId}\`.`
    };
  })
  .build();
