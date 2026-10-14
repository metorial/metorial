import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { taskState } from '../lib/task-values';
import { spec } from '../spec';

export let listActions = SlateTool.create(spec, {
  name: 'List Actions',
  key: 'list_actions',
  description: `Search and list corrective actions in your organization. Filter by status, priority, or assignees. Supports pagination for large result sets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .array(z.string())
        .optional()
        .describe(
          'Filter by action status IDs or names: to do, in progress, complete, or cannot do'
        ),
      priority: z
        .array(z.string())
        .optional()
        .describe('Filter by priority IDs or names: none, low, medium, high'),
      assigneeIds: z.array(z.string()).optional().describe('Filter by assigned user IDs'),
      searchValue: z.string().optional().describe('Search text to filter actions'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      actions: z
        .array(
          z.object({
            actionId: z.string().describe('Unique action identifier'),
            title: z.string().optional().describe('Action title'),
            description: z.string().optional().describe('Action description'),
            status: z.string().optional().describe('Current status'),
            priority: z.string().optional().describe('Priority level'),
            dueAt: z.string().optional().describe('Due date timestamp'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            inspectionId: z.string().optional().describe('Linked inspection ID')
          })
        )
        .describe('List of matching actions'),
      nextPageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listActions({
      status: ctx.input.status,
      priority: ctx.input.priority,
      assigneeIds: ctx.input.assigneeIds,
      searchValue: ctx.input.searchValue,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let actions = result.actions.map((action: any) => {
      let a = action.task ?? action;
      return {
        actionId: a.task_id || a.id,
        title: a.title ?? undefined,
        description: a.description ?? undefined,
        status: taskState(a.status) ?? a.status_id ?? undefined,
        priority: taskState(a.priority) ?? a.priority_id ?? undefined,
        dueAt: a.due_at ?? undefined,
        createdAt: a.created_at ?? undefined,
        inspectionId: a.inspection?.inspection_id ?? a.inspection_id ?? undefined
      };
    });

    return {
      output: { actions, nextPageToken: result.nextPageToken },
      message: `Found **${actions.length}** actions.${result.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
