import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks from Freshsales filtered by status. Returns tasks for the authenticated user only.`,
  constraints: ['Only returns tasks for the API key owner, not other users.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .enum(['open', 'due today', 'due tomorrow', 'overdue', 'completed'])
        .describe('Task filter'),
      includeAssociations: z
        .boolean()
        .optional()
        .describe('Include associated users and target records')
    })
  )
  .output(
    z.object({
      tasks: z.array(
        z.object({
          taskId: z.number(),
          title: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
          dueDate: z.string().nullable().optional(),
          ownerId: z.number().nullable().optional(),
          targetableId: z.number().nullable().optional(),
          targetableType: z.string().nullable().optional(),
          status: z.number().nullable().optional(),
          createdAt: z.string().nullable().optional(),
          updatedAt: z.string().nullable().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let includeStr = ctx.input.includeAssociations ? 'users,targetable' : undefined;
    let tasks = await client.listTasks(ctx.input.filter, { include: includeStr });

    let mappedTasks = tasks.map((t: Record<string, any>) => ({
      taskId: t.id,
      title: t.title,
      description: t.description,
      dueDate: t.due_date,
      ownerId: t.owner_id,
      targetableId: t.targetable_id,
      targetableType: t.targetable_type,
      status: t.status,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return {
      output: { tasks: mappedTasks },
      message: `Found **${mappedTasks.length}** ${ctx.input.filter} tasks.`
    };
  })
  .build();
