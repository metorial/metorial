import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { positiveIntegerSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getTaskByLocalId = SlateTool.create(spec, {
  name: 'Get Task by Local ID',
  key: 'get_task_by_local_id',
  description:
    'Find a BugHerd task by its project-scoped task number (#number in the UI). Call list_projects to discover project IDs. Returns the global task ID for get_task and update_task.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectId: positiveIntegerSchema.describe('Project ID from list_projects'),
      localTaskId: positiveIntegerSchema.describe(
        'Project-scoped task number shown in the BugHerd UI'
      )
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Global task ID for get_task and update_task'),
      localTaskId: z.number().describe('Project-scoped task number'),
      projectId: z.number().describe('Project ID'),
      description: z.string().describe('Task description'),
      status: z.string().describe('Current task status'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let task = await new BugherdClient(ctx.auth.token).getTaskByLocalId(
      ctx.input.projectId,
      ctx.input.localTaskId
    );
    return {
      output: {
        taskId: task.id,
        localTaskId: task.local_task_id,
        projectId: task.project_id,
        description: task.description,
        status: task.status,
        createdAt: task.created_at,
        updatedAt: task.updated_at
      },
      message: `Retrieved task **#${task.local_task_id}** (ID: ${task.id}).`
    };
  })
  .build();
