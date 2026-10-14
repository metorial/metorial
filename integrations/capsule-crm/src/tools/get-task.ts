import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description:
    'Retrieve one Capsule CRM task by ID, including its status, due date, assignment, recurrence, and linked record.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      taskId: z.number().int().positive().describe('Task ID. Use list_tasks to discover IDs.'),
      embed: z
        .array(z.enum(['party', 'opportunity', 'kase', 'owner', 'nextTask']))
        .optional()
        .describe('Additional related data to include')
    })
  )
  .output(
    z.object({
      taskId: z.number(),
      description: z.string(),
      detail: z.string().optional(),
      status: z.string(),
      dueOn: z.string().optional(),
      dueTime: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      completedAt: z.string().optional(),
      completedBy: z.string().optional(),
      category: z.any().optional(),
      owner: z.any().optional(),
      party: z.any().optional(),
      opportunity: z.any().optional(),
      kase: z.any().optional(),
      repeat: z.any().optional(),
      nextTask: z.any().optional(),
      hasTrack: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });
    let task = await client.getTask(ctx.input.taskId, ctx.input.embed);
    return {
      output: {
        taskId: task.id,
        description: task.description,
        detail: task.detail ?? undefined,
        status: task.status,
        dueOn: task.dueOn ?? undefined,
        dueTime: task.dueTime ?? undefined,
        createdAt: task.createdAt ?? undefined,
        updatedAt: task.updatedAt ?? undefined,
        completedAt: task.completedAt ?? undefined,
        completedBy: task.completedBy ?? undefined,
        category: task.category,
        owner: task.owner,
        party: task.party,
        opportunity: task.opportunity,
        kase: task.kase,
        repeat: task.repeat,
        nextTask: task.nextTask,
        hasTrack: task.hasTrack ?? undefined
      },
      message: `Retrieved task **${task.description}** (ID: ${task.id}).`
    };
  })
  .build();
