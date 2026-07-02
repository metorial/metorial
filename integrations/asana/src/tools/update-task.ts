import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task's properties. Supports updating name, notes, assignee, dates, completion status, custom fields, and managing dependencies, projects, tags, followers, and parent.`,
  instructions: [
    'Only provided fields will be updated. Omit fields you do not want to change.',
    'To add/remove tags, projects, dependencies, or followers, use the respective add/remove arrays.'
  ]
})
  .input(
    z.object({
      taskId: z.string().describe('Task GID to update'),
      name: z.string().optional().describe('New task name'),
      notes: z.string().optional().describe('New plain-text description'),
      htmlNotes: z.string().optional().describe('New HTML description'),
      assigneeId: z
        .string()
        .nullable()
        .optional()
        .describe('New assignee GID, "me", or null to unassign'),
      dueOn: z
        .string()
        .nullable()
        .optional()
        .describe('New due date (YYYY-MM-DD) or null to clear'),
      dueAt: z
        .string()
        .nullable()
        .optional()
        .describe('New due date-time (ISO 8601) or null to clear'),
      startOn: z
        .string()
        .nullable()
        .optional()
        .describe('New start date (YYYY-MM-DD) or null to clear'),
      startAt: z
        .string()
        .nullable()
        .optional()
        .describe('New start date-time (ISO 8601) or null to clear'),
      completed: z.boolean().optional().describe('Mark task as completed or incomplete'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Map of custom field GID to value'),

      addProjectIds: z
        .array(z.string())
        .optional()
        .describe('Project GIDs to add the task to'),
      removeProjectIds: z
        .array(z.string())
        .optional()
        .describe('Project GIDs to remove the task from'),
      addTagIds: z.array(z.string()).optional().describe('Tag GIDs to add'),
      removeTagIds: z.array(z.string()).optional().describe('Tag GIDs to remove'),
      addFollowerIds: z.array(z.string()).optional().describe('User GIDs to add as followers'),
      removeFollowerIds: z
        .array(z.string())
        .optional()
        .describe('User GIDs to remove as followers'),
      addDependencyIds: z
        .array(z.string())
        .optional()
        .describe('Task GIDs this task depends on'),
      removeDependencyIds: z
        .array(z.string())
        .optional()
        .describe('Dependency task GIDs to remove'),
      addDependentIds: z
        .array(z.string())
        .optional()
        .describe('Task GIDs that depend on this task'),
      removeDependentIds: z
        .array(z.string())
        .optional()
        .describe('Dependent task GIDs to remove'),
      parentId: z
        .string()
        .nullable()
        .optional()
        .describe('New parent task GID or null to remove parent'),
      sectionId: z.string().optional().describe('Section GID to move the task to')
    })
  )
  .output(
    z.object({
      taskId: z.string(),
      name: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { taskId } = ctx.input;

    // Update core task fields
    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.htmlNotes !== undefined) data.html_notes = ctx.input.htmlNotes;
    else if (ctx.input.notes !== undefined) data.notes = ctx.input.notes;
    if (ctx.input.assigneeId !== undefined) data.assignee = ctx.input.assigneeId;
    if (ctx.input.dueOn !== undefined) data.due_on = ctx.input.dueOn;
    if (ctx.input.dueAt !== undefined) data.due_at = ctx.input.dueAt;
    if (ctx.input.startOn !== undefined) data.start_on = ctx.input.startOn;
    if (ctx.input.startAt !== undefined) data.start_at = ctx.input.startAt;
    if (ctx.input.completed !== undefined) data.completed = ctx.input.completed;
    if (ctx.input.customFields) data.custom_fields = ctx.input.customFields;

    let task = await client.updateTask(taskId, data);

    // Handle relationship changes in parallel
    let operations: Promise<any>[] = [];

    if (ctx.input.addProjectIds) {
      for (let pid of ctx.input.addProjectIds) {
        operations.push(client.addProjectToTask(taskId, pid));
      }
    }
    if (ctx.input.removeProjectIds) {
      for (let pid of ctx.input.removeProjectIds) {
        operations.push(client.removeProjectFromTask(taskId, pid));
      }
    }
    if (ctx.input.addTagIds) {
      for (let tid of ctx.input.addTagIds) {
        operations.push(client.addTagToTask(taskId, tid));
      }
    }
    if (ctx.input.removeTagIds) {
      for (let tid of ctx.input.removeTagIds) {
        operations.push(client.removeTagFromTask(taskId, tid));
      }
    }
    if (ctx.input.addFollowerIds?.length) {
      operations.push(client.addFollowersToTask(taskId, ctx.input.addFollowerIds));
    }
    if (ctx.input.removeFollowerIds?.length) {
      operations.push(client.removeFollowersFromTask(taskId, ctx.input.removeFollowerIds));
    }
    if (ctx.input.addDependencyIds?.length) {
      operations.push(client.addDependenciesToTask(taskId, ctx.input.addDependencyIds));
    }
    if (ctx.input.removeDependencyIds?.length) {
      operations.push(
        client.removeDependenciesFromTask(taskId, ctx.input.removeDependencyIds)
      );
    }
    if (ctx.input.addDependentIds?.length) {
      operations.push(client.addDependentsToTask(taskId, ctx.input.addDependentIds));
    }
    if (ctx.input.removeDependentIds?.length) {
      operations.push(client.removeDependentsFromTask(taskId, ctx.input.removeDependentIds));
    }
    if (ctx.input.parentId !== undefined) {
      operations.push(client.setParentForTask(taskId, ctx.input.parentId));
    }
    if (ctx.input.sectionId) {
      operations.push(client.addTaskToSection(ctx.input.sectionId, taskId));
    }

    if (operations.length > 0) {
      await Promise.all(operations);
    }

    return {
      output: {
        taskId: task.gid,
        name: task.name
      },
      message: `Updated task **${task.name}** (${task.gid}).`
    };
  })
  .build();
