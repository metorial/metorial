import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageTaskList = SlateTool.create(spec, {
  name: 'Manage Task List',
  key: 'manage_task_list',
  description: `Create a task list in a Teamwork project, or list existing task lists for a project. Task lists are containers that organize tasks within a project.`,
  instructions: [
    'For "create", provide projectId and name.',
    'For "list", provide projectId.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['create', 'list']).describe('The action to perform'),
      projectId: z.string().describe('Project ID'),
      name: z.string().optional().describe('Task list name (required for create)'),
      description: z.string().optional().describe('Task list description'),
      page: z.number().optional().describe('Page number (for list)'),
      pageSize: z.number().optional().describe('Results per page (for list)')
    })
  )
  .output(
    z.object({
      taskListId: z.string().optional().describe('ID of the created task list'),
      taskListName: z.string().optional().describe('Name of the created task list'),
      taskLists: z
        .array(
          z.object({
            taskListId: z.string().describe('Task list ID'),
            name: z.string().describe('Task list name'),
            description: z.string().optional().describe('Task list description'),
            complete: z.boolean().optional().describe('Whether the task list is complete'),
            taskCount: z.number().optional().describe('Number of tasks')
          })
        )
        .optional()
        .describe('List of task lists (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required to create a task list');
      let result = await client.createTaskList(ctx.input.projectId, {
        name: ctx.input.name,
        description: ctx.input.description
      });
      let listId = result.TASKLISTID || result.id;
      return {
        output: {
          taskListId: listId ? String(listId) : undefined,
          taskListName: ctx.input.name
        },
        message: `Created task list **${ctx.input.name}** in project ${ctx.input.projectId}.`
      };
    }

    if (action === 'list') {
      let result = await client.getTaskLists(ctx.input.projectId, {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
      let lists = (result.tasklists || result['todo-lists'] || []).map((tl: any) => ({
        taskListId: String(tl.id),
        name: tl.name || '',
        description: tl.description || undefined,
        complete: tl.complete ?? undefined,
        taskCount:
          tl['uncompleted-count'] != null ? Number(tl['uncompleted-count']) : undefined
      }));
      return {
        output: { taskLists: lists },
        message: `Found **${lists.length}** task list(s).`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
