import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

let taskSchema = z.object({
  taskId: z.number().describe('Unique identifier'),
  description: z.string().optional().describe('Task description'),
  detail: z.string().optional().describe('Additional details'),
  status: z.string().optional().describe('Status: open, completed, pending'),
  dueOn: z.string().optional().describe('Due date (YYYY-MM-DD)'),
  dueTime: z.string().optional().describe('Due time (HH:MM:SS)'),
  category: z.any().optional().describe('Task category'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().optional().describe('ISO 8601 update timestamp'),
  completedAt: z.string().optional().describe('ISO 8601 completion timestamp'),
  owner: z.any().optional().describe('Assigned owner'),
  party: z.any().optional().describe('Linked party'),
  opportunity: z.any().optional().describe('Linked opportunity'),
  kase: z.any().optional().describe('Linked project')
});

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks from Capsule CRM with pagination. Filter by status (open, completed, pending). Use embed to include linked party, opportunity, or project details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['open', 'completed', 'pending'])
        .optional()
        .describe('Filter by task status'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page, 1-100 (default: 50)'),
      embed: z
        .array(z.enum(['party', 'opportunity', 'kase', 'owner', 'nextTask']))
        .optional()
        .describe('Additional data to embed')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskSchema).describe('List of tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let result = await client.listTasks({
      status: ctx.input.status,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      embed: ctx.input.embed
    });

    let tasks = (result.tasks || []).map((t: any) => ({
      taskId: t.id,
      description: t.description,
      detail: t.detail,
      status: t.status,
      dueOn: t.dueOn,
      dueTime: t.dueTime,
      category: t.category,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      completedAt: t.completedAt,
      owner: t.owner,
      party: t.party,
      opportunity: t.opportunity,
      kase: t.kase
    }));

    return {
      output: { tasks },
      message: `Retrieved **${tasks.length}** tasks.`
    };
  })
  .build();
