import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieve full details for a task including assignee, dates, notes (with HTML), subtask count, projects, tags, followers, custom fields, dependencies, and dependents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task GID')
    })
  )
  .output(
    z.object({
      taskId: z.string(),
      name: z.string(),
      resourceSubtype: z.string().optional(),
      assignee: z.any().nullable().optional(),
      completed: z.boolean().optional(),
      completedAt: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      dueOn: z.string().nullable().optional(),
      dueAt: z.string().nullable().optional(),
      startOn: z.string().nullable().optional(),
      startAt: z.string().nullable().optional(),
      modifiedAt: z.string().optional(),
      notes: z.string().optional(),
      htmlNotes: z.string().optional(),
      numSubtasks: z.number().optional(),
      parent: z.any().nullable().optional(),
      projects: z.array(z.any()).optional(),
      tags: z.array(z.any()).optional(),
      followers: z.array(z.any()).optional(),
      customFields: z.array(z.any()).optional(),
      dependencies: z.array(z.any()).optional(),
      dependents: z.array(z.any()).optional(),
      memberships: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let t = await client.getTask(ctx.input.taskId);

    return {
      output: {
        taskId: t.gid,
        name: t.name,
        resourceSubtype: t.resource_subtype,
        assignee: t.assignee,
        completed: t.completed,
        completedAt: t.completed_at,
        createdAt: t.created_at,
        dueOn: t.due_on,
        dueAt: t.due_at,
        startOn: t.start_on,
        startAt: t.start_at,
        modifiedAt: t.modified_at,
        notes: t.notes,
        htmlNotes: t.html_notes,
        numSubtasks: t.num_subtasks,
        parent: t.parent,
        projects: t.projects,
        tags: t.tags,
        followers: t.followers,
        customFields: t.custom_fields,
        dependencies: t.dependencies,
        dependents: t.dependents,
        memberships: t.memberships
      },
      message: `Retrieved task **${t.name}** (${t.gid}).`
    };
  })
  .build();
