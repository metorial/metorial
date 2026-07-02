import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieve full details for a specific Scale AI task by ID, including its status, response (if completed), metadata, and audit information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to retrieve')
    })
  )
  .output(
    z
      .object({
        taskId: z.string().describe('Unique identifier of the task'),
        taskType: z.string().optional().describe('Type of the task'),
        status: z
          .string()
          .optional()
          .describe('Current status (pending, completed, canceled, error)'),
        instruction: z.string().optional().describe('Task instructions'),
        response: z
          .any()
          .optional()
          .describe('Task response/annotations (populated when completed)'),
        callbackUrl: z
          .string()
          .optional()
          .describe('Callback URL for completion notification'),
        callbackSucceeded: z
          .boolean()
          .optional()
          .describe('Whether the callback was delivered successfully'),
        metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata'),
        createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
        completedAt: z.string().optional().describe('ISO 8601 completion timestamp'),
        updatedAt: z.string().optional().describe('ISO 8601 last update timestamp')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getTask(ctx.input.taskId);

    return {
      output: {
        taskId: result.task_id,
        taskType: result.type,
        status: result.status,
        instruction: result.instruction,
        response: result.response,
        callbackUrl: result.callback_url,
        callbackSucceeded: result.callback_succeeded,
        metadata: result.metadata,
        createdAt: result.created_at,
        completedAt: result.completed_at,
        updatedAt: result.updated_at,
        ...result
      },
      message: `Task **${result.task_id}** is \`${result.status}\`${result.type ? ` (type: \`${result.type}\`)` : ''}.`
    };
  })
  .build();
