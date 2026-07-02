import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkSerpTask = SlateTool.create(spec, {
  name: 'Check SERP Task Status',
  key: 'check_serp_task',
  description: `Check the processing status of a scheduled SERP search task. Returns the current status: completed, processing in queue, or waiting for process.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Unique identifier of the scheduled SERP task')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      message: z
        .string()
        .describe(
          'Task status message: "Completed", "Processing in a queue", or "Waiting for a process"'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.checkSerpStatus(ctx.input.taskId);

    return {
      output: {
        status: response?.status ?? 'unknown',
        message: response?.msg ?? ''
      },
      message: `SERP task **${ctx.input.taskId}**: ${response?.msg ?? 'unknown status'}`
    };
  })
  .build();
