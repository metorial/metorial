import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks under a specific project in a Toggl workspace. Tasks provide granular categorization within projects. Requires a paid plan.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Uses the configured default if not provided.'),
      projectId: z.string().describe('Project ID to list tasks for')
    })
  )
  .output(
    z.object({
      tasks: z
        .array(
          z.object({
            taskId: z.number().describe('Task ID'),
            name: z.string().describe('Task name'),
            active: z.boolean().describe('Whether active'),
            estimatedSeconds: z.number().nullable().describe('Estimated duration in seconds'),
            trackedSeconds: z.number().nullable().describe('Tracked time in seconds'),
            userId: z.number().nullable().describe('Assigned user ID'),
            projectId: z.number().describe('Parent project ID')
          })
        )
        .describe('List of tasks'),
      totalCount: z.number().describe('Number of tasks returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token);
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;

    let raw = await client.listTasks(wsId, ctx.input.projectId);

    let tasks = (raw ?? []).map((t: any) => ({
      taskId: t.id,
      name: t.name,
      active: t.active ?? true,
      estimatedSeconds: t.estimated_seconds ?? null,
      trackedSeconds: t.tracked_seconds ?? null,
      userId: t.user_id ?? null,
      projectId: t.project_id ?? Number.parseInt(ctx.input.projectId, 10)
    }));

    return {
      output: { tasks, totalCount: tasks.length },
      message: `Found **${tasks.length}** tasks in project #${ctx.input.projectId}`
    };
  })
  .build();
