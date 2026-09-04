import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let searchTasks = SlateTool.create(spec, {
  name: 'Search Tasks',
  key: 'search_tasks',
  description: `Search and filter tasks in the ClickUp Workspace selected by workspaceId. Call get_workspaces to discover authorized Workspace IDs. Use listId to scope the search to a specific list in that Workspace, or omit it to search across the selected Workspace.`,
  instructions: [
    'Always provide workspaceId to select the target Workspace. Call get_workspaces to discover authorized Workspace IDs.',
    'Provide listId to get tasks from a specific list in the selected Workspace, or leave it empty to search across that Workspace.',
    'Results are paginated; use the page parameter to fetch subsequent pages.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      listId: z.string().optional().describe('List ID to scope the search to a specific list'),
      page: z.number().optional().describe('Page number for pagination (starts at 0)'),
      orderBy: z.string().optional().describe('Field to order by: created, updated, due_date'),
      reverse: z.boolean().optional().describe('Reverse sort order'),
      includeClosed: z.boolean().optional().describe('Include closed tasks'),
      includeSubtasks: z.boolean().optional().describe('Include subtasks in results'),
      statuses: z.array(z.string()).optional().describe('Filter by status names'),
      assignees: z.array(z.string()).optional().describe('Filter by assignee user IDs'),
      tags: z.array(z.string()).optional().describe('Filter by tag names'),
      dueDateGt: z.string().optional().describe('Due date greater than (Unix ms timestamp)'),
      dueDateLt: z.string().optional().describe('Due date less than (Unix ms timestamp)'),
      dateCreatedGt: z.string().optional().describe('Created after (Unix ms timestamp)'),
      dateCreatedLt: z.string().optional().describe('Created before (Unix ms timestamp)'),
      dateUpdatedGt: z.string().optional().describe('Updated after (Unix ms timestamp)'),
      dateUpdatedLt: z.string().optional().describe('Updated before (Unix ms timestamp)'),
      spaceIds: z
        .array(z.string())
        .optional()
        .describe('Filter by Space IDs (workspace-level search only)'),
      listIds: z
        .array(z.string())
        .optional()
        .describe('Filter by List IDs (workspace-level search only)')
    })
  )
  .output(
    z.object({
      tasks: z.array(
        z.object({
          taskId: z.string(),
          taskName: z.string(),
          taskUrl: z.string(),
          status: z.string().optional(),
          priority: z.string().optional(),
          assignees: z.array(z.string()).optional(),
          dueDate: z.string().optional(),
          dateCreated: z.string().optional(),
          listId: z.string().optional(),
          listName: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let result = await client.searchTasks(ctx.input.workspaceId, {
      page: ctx.input.page,
      orderBy: ctx.input.orderBy,
      reverse: ctx.input.reverse,
      includeClosed: ctx.input.includeClosed,
      subtasks: ctx.input.includeSubtasks,
      statuses: ctx.input.statuses,
      assignees: ctx.input.assignees,
      tags: ctx.input.tags,
      dueDateGt: ctx.input.dueDateGt ? Number(ctx.input.dueDateGt) : undefined,
      dueDateLt: ctx.input.dueDateLt ? Number(ctx.input.dueDateLt) : undefined,
      dateCreatedGt: ctx.input.dateCreatedGt ? Number(ctx.input.dateCreatedGt) : undefined,
      dateCreatedLt: ctx.input.dateCreatedLt ? Number(ctx.input.dateCreatedLt) : undefined,
      dateUpdatedGt: ctx.input.dateUpdatedGt ? Number(ctx.input.dateUpdatedGt) : undefined,
      dateUpdatedLt: ctx.input.dateUpdatedLt ? Number(ctx.input.dateUpdatedLt) : undefined,
      spaces: ctx.input.spaceIds,
      listIds: ctx.input.listId ? [ctx.input.listId] : ctx.input.listIds
    });
    let tasks = result.tasks;

    return {
      output: {
        tasks: tasks.map((t: any) => ({
          taskId: t.id,
          taskName: t.name,
          taskUrl: t.url,
          status: t.status?.status ?? undefined,
          priority: t.priority?.priority ?? undefined,
          assignees: t.assignees?.map((a: any) => String(a.id)) ?? [],
          dueDate: t.due_date ?? undefined,
          dateCreated: t.date_created ?? undefined,
          listId: t.list?.id ?? undefined,
          listName: t.list?.name ?? undefined
        }))
      },
      message: `Found **${tasks.length}** task(s).`
    };
  })
  .build();
