import { SlateTool } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List and search tasks in Wrike. Can retrieve tasks from a specific folder/project, by task IDs, or all tasks in the account. Supports filtering by status, importance, assignees, date ranges, and custom statuses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Folder or project ID to list tasks from'),
      taskIds: z.array(z.string()).optional().describe('Specific task IDs to retrieve'),
      title: z.string().optional().describe('Filter tasks by title (partial match)'),
      status: z
        .string()
        .optional()
        .describe('Filter by status: Active, Completed, Deferred, Cancelled'),
      importance: z.string().optional().describe('Filter by importance: High, Normal, Low'),
      responsibles: z.array(z.string()).optional().describe('Filter by assignee contact IDs'),
      customStatuses: z.array(z.string()).optional().describe('Filter by custom status IDs'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter tasks updated after this date (ISO 8601)'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter tasks created after this date (ISO 8601)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of tasks to return (default 100, max 1000)'),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          'Additional fields to include: description, briefDescription, customFields, dependencyIds, metadata, etc.'
        )
    })
  )
  .output(
    z.object({
      tasks: z.array(
        z.object({
          taskId: z.string(),
          title: z.string(),
          status: z.string(),
          importance: z.string(),
          createdDate: z.string(),
          updatedDate: z.string(),
          completedDate: z.string().optional(),
          parentIds: z.array(z.string()),
          responsibleIds: z.array(z.string()).optional(),
          permalink: z.string().optional(),
          customStatusId: z.string().optional(),
          dates: z
            .object({
              type: z.string(),
              start: z.string().optional(),
              due: z.string().optional(),
              duration: z.number().optional()
            })
            .optional(),
          description: z.string().optional(),
          customFields: z
            .array(
              z.object({
                fieldId: z.string(),
                value: z.string()
              })
            )
            .optional()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    let result = await client.getTasks({
      folderId: ctx.input.folderId,
      taskIds: ctx.input.taskIds,
      title: ctx.input.title,
      status: ctx.input.status,
      importance: ctx.input.importance,
      responsibles: ctx.input.responsibles,
      customStatuses: ctx.input.customStatuses,
      limit: ctx.input.limit,
      fields: ctx.input.fields,
      updatedDate: ctx.input.updatedAfter ? { start: ctx.input.updatedAfter } : undefined,
      createdDate: ctx.input.createdAfter ? { start: ctx.input.createdAfter } : undefined
    });

    let tasks = result.data.map(t => ({
      taskId: t.id,
      title: t.title,
      status: t.status,
      importance: t.importance,
      createdDate: t.createdDate,
      updatedDate: t.updatedDate,
      completedDate: t.completedDate,
      parentIds: t.parentIds,
      responsibleIds: t.responsibleIds,
      permalink: t.permalink,
      customStatusId: t.customStatusId,
      dates: t.dates
        ? {
            type: t.dates.type,
            start: t.dates.start,
            due: t.dates.due,
            duration: t.dates.duration
          }
        : undefined,
      description: t.description,
      customFields: t.customFields?.map(cf => ({
        fieldId: cf.id,
        value: cf.value
      }))
    }));

    return {
      output: { tasks, count: tasks.length },
      message: `Found **${tasks.length}** task(s).`
    };
  })
  .build();
