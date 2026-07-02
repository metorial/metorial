import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task's name or description. Only the fields provided will be updated; omitted fields remain unchanged.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The ID of the project containing the task'),
      taskId: z.string().describe('The ID of the task to update'),
      name: z.string().optional().describe('New name for the task'),
      description: z.string().optional().describe('New description for the task')
    })
  )
  .output(
    z.object({
      task: z.record(z.string(), z.unknown()).describe('The updated task')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data: Record<string, string> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;

    let task = await client.updateTask(ctx.input.projectId, ctx.input.taskId, data);

    return {
      output: { task },
      message: `Updated task **${ctx.input.taskId}** in project **${ctx.input.projectId}**.`
    };
  })
  .build();
