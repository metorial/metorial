import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkWebTaskStatus = SlateTool.create(spec, {
  name: 'Check AI Task Status',
  key: 'check_web_task_status',
  description: `Check the status and result of an asynchronous AI web task. Use the workflow ID returned from a previous async Perform AI Web Task call.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('Workflow ID from the async web task submission')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Task status: COMPLETED, RUNNING, or FAILED'),
      result: z.unknown().optional().describe('Task result if completed'),
      error: z.string().optional().describe('Error message if failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getWebTaskStatus(ctx.input.workflowId);

    return {
      output: {
        status: result.status,
        result: result.result,
        error: result.error
      },
      message: `Task **${ctx.input.workflowId}** status: **${result.status}**${result.error ? ` — Error: ${result.error}` : ''}`
    };
  })
  .build();
