import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { mapTask, taskOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listTasksTool = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Search and list tasks in Kommo. Filter by completion status, responsible user, linked entity, or task IDs. Returns tasks with their deadlines, linked entities, and completion status.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      isCompleted: z.boolean().optional().describe('Filter by completion status'),
      responsibleUserIds: z
        .array(z.number())
        .optional()
        .describe('Filter by responsible user IDs'),
      entityType: z
        .enum(['leads', 'contacts', 'companies'])
        .optional()
        .describe('Filter by linked entity type'),
      entityIds: z.array(z.number()).optional().describe('Filter by linked entity IDs'),
      taskIds: z.array(z.number()).optional().describe('Filter by specific task IDs'),
      orderBy: z.enum(['created_at', 'updated_at', 'id']).optional().describe('Sort field'),
      orderDir: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page (max 250)')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let tasks = await client.listTasks(
      {
        ids: ctx.input.taskIds,
        responsibleUserIds: ctx.input.responsibleUserIds,
        isCompleted: ctx.input.isCompleted,
        entityType: ctx.input.entityType,
        entityIds: ctx.input.entityIds,
        orderBy: ctx.input.orderBy,
        orderDir: ctx.input.orderDir
      },
      { page: ctx.input.page, limit: ctx.input.limit }
    );

    let mapped = tasks.map(mapTask);

    return {
      output: { tasks: mapped },
      message: `Found **${mapped.length}** task(s).`
    };
  })
  .build();
