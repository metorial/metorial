import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchTasks = SlateTool.create(spec, {
  name: 'Search Tasks',
  key: 'search_tasks',
  description: `Search for tasks in a workspace using various filters like text, assignee, projects, tags, completion status, and date ranges. Supports full-text search across task names and descriptions.`,
  instructions: [
    'The text parameter performs full-text search across task names and descriptions.',
    'Date filters use ISO 8601 format (YYYY-MM-DD).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('Workspace GID to search in'),
      text: z.string().optional().describe('Full-text search query'),
      assigneeId: z.string().optional().describe('Filter by assignee GID or "me"'),
      projectIds: z
        .array(z.string())
        .optional()
        .describe('Filter by project GIDs (any match)'),
      tagIds: z.array(z.string()).optional().describe('Filter by tag GIDs (any match)'),
      sectionIds: z
        .array(z.string())
        .optional()
        .describe('Filter by section GIDs (any match)'),
      completed: z.boolean().optional().describe('Filter by completion status'),
      isSubtask: z.boolean().optional().describe('Filter by whether task is a subtask'),
      dueOnBefore: z
        .string()
        .optional()
        .describe('Tasks due on or before this date (YYYY-MM-DD)'),
      dueOnAfter: z
        .string()
        .optional()
        .describe('Tasks due on or after this date (YYYY-MM-DD)'),
      createdOnBefore: z.string().optional().describe('Tasks created on or before this date'),
      createdOnAfter: z.string().optional().describe('Tasks created on or after this date'),
      modifiedOnBefore: z
        .string()
        .optional()
        .describe('Tasks modified on or before this date'),
      modifiedOnAfter: z.string().optional().describe('Tasks modified on or after this date'),
      sortBy: z
        .enum(['due_date', 'created_at', 'completed_at', 'likes', 'modified_at'])
        .optional()
        .describe('Sort field'),
      sortAscending: z.boolean().optional().describe('Sort ascending (default false)')
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
          dueOn: z.string().nullable().optional(),
          createdAt: z.string().optional(),
          modifiedAt: z.string().optional(),
          notes: z.string().optional(),
          projects: z.array(z.any()).optional(),
          tags: z.array(z.any()).optional(),
          customFields: z.array(z.any()).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {};
    if (ctx.input.text) params.text = ctx.input.text;
    if (ctx.input.assigneeId) params['assignee.any'] = ctx.input.assigneeId;
    if (ctx.input.projectIds?.length) params['projects.any'] = ctx.input.projectIds.join(',');
    if (ctx.input.tagIds?.length) params['tags.any'] = ctx.input.tagIds.join(',');
    if (ctx.input.sectionIds?.length) params['sections.any'] = ctx.input.sectionIds.join(',');
    if (ctx.input.completed !== undefined) params.completed = ctx.input.completed;
    if (ctx.input.isSubtask !== undefined) params.is_subtask = ctx.input.isSubtask;
    if (ctx.input.dueOnBefore) params['due_on.before'] = ctx.input.dueOnBefore;
    if (ctx.input.dueOnAfter) params['due_on.after'] = ctx.input.dueOnAfter;
    if (ctx.input.createdOnBefore) params['created_on.before'] = ctx.input.createdOnBefore;
    if (ctx.input.createdOnAfter) params['created_on.after'] = ctx.input.createdOnAfter;
    if (ctx.input.modifiedOnBefore) params['modified_on.before'] = ctx.input.modifiedOnBefore;
    if (ctx.input.modifiedOnAfter) params['modified_on.after'] = ctx.input.modifiedOnAfter;
    if (ctx.input.sortBy) params.sort_by = ctx.input.sortBy;
    if (ctx.input.sortAscending !== undefined) params.sort_ascending = ctx.input.sortAscending;

    let result = await client.searchTasks(ctx.input.workspaceId, params);
    let tasks = (result.data || []).map((t: any) => ({
      taskId: t.gid,
      name: t.name,
      assignee: t.assignee,
      completed: t.completed,
      completedAt: t.completed_at,
      dueOn: t.due_on,
      createdAt: t.created_at,
      modifiedAt: t.modified_at,
      notes: t.notes,
      projects: t.projects,
      tags: t.tags,
      customFields: t.custom_fields
    }));

    return {
      output: { tasks },
      message: `Found **${tasks.length}** task(s) matching the search criteria.`
    };
  })
  .build();
