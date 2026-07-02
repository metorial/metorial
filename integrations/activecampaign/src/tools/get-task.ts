import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description:
    'Retrieves a deal task by ID, including its related object and assignment fields.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to retrieve')
    })
  )
  .output(
    z.object({
      taskId: z.string(),
      title: z.string().optional(),
      note: z.string().optional(),
      duedate: z.string().optional(),
      status: z.string().optional(),
      relType: z.string().optional(),
      relId: z.string().optional(),
      taskTypeId: z.string().optional(),
      assigneeId: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let result = await client.getTask(ctx.input.taskId);
    let task = result.dealTask;

    return {
      output: {
        taskId: task.id,
        title: task.title || undefined,
        note: task.note || undefined,
        duedate: task.duedate || undefined,
        status: task.status !== undefined ? String(task.status) : undefined,
        relType: task.reltype || undefined,
        relId: task.relid || undefined,
        taskTypeId: task.dealTasktype || undefined,
        assigneeId: task.assignee || undefined,
        createdAt: task.cdate || undefined,
        updatedAt: task.udate || undefined
      },
      message: `Retrieved task **${task.title || task.id}** (ID: ${task.id}).`
    };
  })
  .build();
