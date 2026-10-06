import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTask } from '../lib/models';
import { spec } from '../spec';

export const getTasks = SlateTool.create(spec, {
  name: 'Get Tasks',
  key: 'get_tasks',
  description:
    'List Close tasks or retrieve a single task by ID. Provides completion, assignment, lead and date metadata without downloading voicemail or message files.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      taskId: z
        .string()
        .optional()
        .describe('Read this task only. Cannot be combined with list filters or paging.'),
      leadId: z.string().optional(),
      assignedTo: z.string().optional(),
      isComplete: z.boolean().optional(),
      type: z
        .string()
        .optional()
        .describe('Task type; defaults to lead. Use all for all documented task types.'),
      limit: z.number().optional(),
      skip: z.number().optional()
    })
  )
  .output(
    z.object({
      tasks: z.array(
        z.object({
          taskId: z.string(),
          leadId: z.string().optional(),
          contactId: z.string().optional(),
          text: z.string().optional(),
          assignedTo: z.string().optional(),
          isComplete: z.boolean(),
          dueDate: z.string().nullable(),
          type: z.string(),
          dateCreated: z.string(),
          dateUpdated: z.string()
        })
      ),
      hasMore: z.boolean(),
      nextSkip: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth);
    const { taskId, ...filters } = ctx.input;
    if (taskId !== undefined) {
      if (Object.values(filters).some(value => value !== undefined))
        throw createApiServiceError('taskId cannot be combined with list filters or paging.');
      const task = await client.getTask(taskId);
      return {
        output: { tasks: [mapTask(task)], hasMore: false },
        message: `Retrieved task **${task.id}**.`
      };
    }
    const result = await client.listTasks(filters);
    return {
      output: {
        tasks: result.data.map(mapTask),
        hasMore: result.has_more,
        nextSkip: result.has_more ? (filters.skip ?? 0) + result.data.length : undefined
      },
      message: `Returned ${result.data.length} task(s)${result.has_more ? '; more available' : ''}.`
    };
  })
  .build();
