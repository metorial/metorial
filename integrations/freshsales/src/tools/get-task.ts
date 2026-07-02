import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieve a single task by ID from Freshsales.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to retrieve')
    })
  )
  .output(
    z.object({
      taskId: z.number(),
      title: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
      ownerId: z.number().nullable().optional(),
      targetableId: z.number().nullable().optional(),
      targetableType: z.string().nullable().optional(),
      status: z.number().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let task = await client.getTask(ctx.input.taskId);

    return {
      output: {
        taskId: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.due_date,
        ownerId: task.owner_id,
        targetableId: task.targetable_id,
        targetableType: task.targetable_type,
        status: task.status,
        createdAt: task.created_at,
        updatedAt: task.updated_at
      },
      message: `Retrieved task **${task.title || task.id}**.`
    };
  })
  .build();
