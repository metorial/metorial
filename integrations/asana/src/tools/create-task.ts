import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in a project or workspace. Supports setting name, notes, assignee, dates, project/section placement, tags, followers, parent task, and custom field values.`,
  instructions: [
    'Either projectId or workspaceId must be provided.',
    'To place a task in a section, provide both projectId and sectionId.',
    'Custom field values should be a map of custom field GID to value.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Task name'),
      workspaceId: z.string().optional().describe('Workspace GID (required if no projectId)'),
      projectId: z.string().optional().describe('Project GID to add the task to'),
      sectionId: z.string().optional().describe('Section GID to place the task in'),
      notes: z.string().optional().describe('Plain-text task description'),
      htmlNotes: z
        .string()
        .optional()
        .describe('HTML task description (overrides notes if both provided)'),
      assigneeId: z.string().optional().describe('Assignee user GID or "me"'),
      dueOn: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      dueAt: z.string().optional().describe('Due date-time in ISO 8601 format'),
      startOn: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      startAt: z.string().optional().describe('Start date-time in ISO 8601 format'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
      parentId: z.string().optional().describe('Parent task GID to create as subtask'),
      tagIds: z.array(z.string()).optional().describe('Tag GIDs to add to the task'),
      followerIds: z.array(z.string()).optional().describe('User GIDs to add as followers'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Map of custom field GID to value'),
      resourceSubtype: z
        .enum(['default_task', 'milestone', 'section', 'approval'])
        .optional()
        .describe('Task type')
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

    let data: Record<string, any> = { name: ctx.input.name };

    if (ctx.input.workspaceId) data.workspace = ctx.input.workspaceId;
    if (ctx.input.projectId) {
      data.projects = [ctx.input.projectId];
      if (ctx.input.sectionId) {
        data.memberships = [{ project: ctx.input.projectId, section: ctx.input.sectionId }];
      }
    }
    if (ctx.input.htmlNotes) data.html_notes = ctx.input.htmlNotes;
    else if (ctx.input.notes) data.notes = ctx.input.notes;
    if (ctx.input.assigneeId) data.assignee = ctx.input.assigneeId;
    if (ctx.input.dueOn) data.due_on = ctx.input.dueOn;
    if (ctx.input.dueAt) data.due_at = ctx.input.dueAt;
    if (ctx.input.startOn) data.start_on = ctx.input.startOn;
    if (ctx.input.startAt) data.start_at = ctx.input.startAt;
    if (ctx.input.completed !== undefined) data.completed = ctx.input.completed;
    if (ctx.input.parentId) data.parent = ctx.input.parentId;
    if (ctx.input.tagIds) data.tags = ctx.input.tagIds;
    if (ctx.input.followerIds) data.followers = ctx.input.followerIds;
    if (ctx.input.customFields) data.custom_fields = ctx.input.customFields;
    if (ctx.input.resourceSubtype) data.resource_subtype = ctx.input.resourceSubtype;

    let task = await client.createTask(data);

    return {
      output: {
        taskId: task.gid,
        name: task.name
      },
      message: `Created task **${task.name}** (${task.gid}).`
    };
  })
  .build();
