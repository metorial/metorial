import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubtasks = SlateTool.create(spec, {
  name: 'List Subtasks',
  key: 'list_subtasks',
  description: `List all subtasks of a given task.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Parent task GID'),
      limit: z.number().optional().describe('Maximum number of subtasks to return')
    })
  )
  .output(
    z.object({
      subtasks: z.array(
        z.object({
          taskId: z.string(),
          name: z.string(),
          assignee: z.any().nullable().optional(),
          completed: z.boolean().optional(),
          completedAt: z.string().nullable().optional(),
          dueOn: z.string().nullable().optional(),
          dueAt: z.string().nullable().optional(),
          createdAt: z.string().optional(),
          modifiedAt: z.string().optional(),
          notes: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSubtasks(ctx.input.taskId, { limit: ctx.input.limit });
    let subtasks = (result.data || []).map((t: any) => ({
      taskId: t.gid,
      name: t.name,
      assignee: t.assignee,
      completed: t.completed,
      completedAt: t.completed_at,
      dueOn: t.due_on,
      dueAt: t.due_at,
      createdAt: t.created_at,
      modifiedAt: t.modified_at,
      notes: t.notes
    }));

    return {
      output: { subtasks },
      message: `Found **${subtasks.length}** subtask(s).`
    };
  })
  .build();
