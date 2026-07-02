import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let moveTask = SlateTool.create(spec, {
  name: 'Move Task',
  key: 'move_task',
  description: `Move a task to a different project, section, or make it a sub-task of another task. Provide exactly one destination.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID to move'),
      projectId: z.string().optional().describe('Destination project ID'),
      sectionId: z.string().optional().describe('Destination section ID'),
      parentId: z.string().optional().describe('Parent task ID to nest under')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Moved task ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.moveTask(ctx.input.taskId, {
      projectId: ctx.input.projectId,
      sectionId: ctx.input.sectionId,
      parentId: ctx.input.parentId
    });

    return {
      output: {
        taskId: ctx.input.taskId
      },
      message: `Moved task (ID: ${ctx.input.taskId}).`
    };
  });
