import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieves the current status and details of a conversion task. Use this to check if a conversion has completed and to get the result file ID for downloading.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('The task ID returned when the conversion was created')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('The task ID'),
      status: z.string().describe('Current status: PENDING, RUNNING, SUCCESS, or ERROR'),
      resultFileId: z
        .string()
        .nullable()
        .describe('File ID of the converted result (available when SUCCESS)'),
      conversionProgress: z.number().describe('Progress percentage (0-100)'),
      errorMessage: z.string().nullable().describe('Error message if the task failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let status = await client.getTaskStatus(ctx.input.taskId);

    return {
      output: {
        taskId: ctx.input.taskId,
        status: status.status,
        resultFileId: status.file_id,
        conversionProgress: status.conversionProgress,
        errorMessage: status.error
      },
      message:
        status.status === 'SUCCESS'
          ? `Task **${ctx.input.taskId}** completed. Result file ID: \`${status.file_id}\``
          : `Task **${ctx.input.taskId}** is **${status.status}** (${status.conversionProgress}% complete).${status.error ? ` Error: ${status.error}` : ''}`
    };
  })
  .build();
