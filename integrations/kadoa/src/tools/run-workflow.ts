import { SlateTool } from 'slates';
import { z } from 'zod';
import { KadoaClient } from '../lib/client';
import { spec } from '../spec';

export let runWorkflow = SlateTool.create(spec, {
  name: 'Run Workflow',
  key: 'run_workflow',
  description: `Execute a Kadoa extraction workflow immediately. Optionally pass variables for dynamic URL placeholders and a row limit.
Returns the job ID for tracking the run.`,
  constraints: [
    'Rate-limited: may return 429 if the pipeline is crowded or user rate limit is reached.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('ID of the workflow to run'),
      variables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Variables for dynamic URL placeholders'),
      limit: z.number().optional().describe('Maximum number of records to extract in this run')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('ID of the started job'),
      status: z.string().optional().describe('Run status'),
      message: z.string().optional().describe('Status message from API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KadoaClient({ token: ctx.auth.token });

    let result = await client.runWorkflow(ctx.input.workflowId, {
      variables: ctx.input.variables,
      limit: ctx.input.limit
    });

    return {
      output: {
        jobId: result.jobId,
        status: result.status,
        message: result.message
      },
      message: `Workflow **${ctx.input.workflowId}** started.${result.jobId ? ` Job ID: **${result.jobId}**` : ''}`
    };
  })
  .build();
