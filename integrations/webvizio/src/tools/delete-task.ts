import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Deletes a task from Webvizio. Identify the task by its ID or external ID. This action is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.number().optional().describe('Webvizio internal task ID'),
      externalId: z.string().optional().describe('External identifier assigned to the task')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the task was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteTask({
      taskId: ctx.input.taskId,
      externalId: ctx.input.externalId
    });

    return {
      output: {
        deleted: true
      },
      message: `Successfully deleted task`
    };
  })
  .build();
