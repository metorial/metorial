import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks filtered by project, section, or assignee. At least one filter must be provided. When filtering by assignee, a workspace GID is also required.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().optional().describe('Filter by project GID'),
      sectionId: z.string().optional().describe('Filter by section GID'),
      assigneeId: z.string().optional().describe('Filter by assignee GID or "me"'),
      workspaceId: z.string().optional().describe('Required when filtering by assignee'),
      completedSince: z
        .string()
        .optional()
        .describe(
          'Only return tasks completed since this ISO 8601 date. Use "now" for incomplete tasks only.'
        ),
      modifiedSince: z
        .string()
        .optional()
        .describe('Only return tasks modified since this ISO 8601 date'),
      limit: z.number().optional().describe('Maximum number of tasks to return (default 100)')
    })
  )
  .output(
    z.object({
      tasks: z.array(
        z.object({
          taskId: z.string(),
          name: z.string(),
          assignee: z.any().nullable().optional(),
          completed: z.boolean().optional(),
          completedAt: z.string().nullable().optional(),
          createdAt: z.string().optional(),
          dueOn: z.string().nullable().optional(),
          dueAt: z.string().nullable().optional(),
          modifiedAt: z.string().optional(),
          notes: z.string().optional(),
          numSubtasks: z.number().optional(),
          customFields: z.array(z.any()).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTasks({
      project: ctx.input.projectId,
      section: ctx.input.sectionId,
      assignee: ctx.input.assigneeId,
      workspace: ctx.input.workspaceId,
      completedSince: ctx.input.completedSince,
      modifiedSince: ctx.input.modifiedSince,
      limit: ctx.input.limit
    });

    let tasks = (result.data || []).map((t: any) => ({
      taskId: t.gid,
      name: t.name,
      assignee: t.assignee,
      completed: t.completed,
      completedAt: t.completed_at,
      createdAt: t.created_at,
      dueOn: t.due_on,
      dueAt: t.due_at,
      modifiedAt: t.modified_at,
      notes: t.notes,
      numSubtasks: t.num_subtasks,
      customFields: t.custom_fields
    }));

    return {
      output: { tasks },
      message: `Found **${tasks.length}** task(s).`
    };
  })
  .build();
