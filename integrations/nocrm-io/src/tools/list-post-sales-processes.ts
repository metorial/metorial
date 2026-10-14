import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPostSalesProcesses = SlateTool.create(spec, {
  name: 'List Post-Sales Processes',
  key: 'list_post_sales_processes',
  description:
    'List post-sales processes for a lead or a sales representative, including process IDs, status, task counts, and the next action date. Use get_lead or list_leads to discover lead IDs, or list_users to discover user IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      leadId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Lead ID from get_lead or list_leads. Provide either leadId or userId.'),
      userId: z
        .union([z.number().int().positive(), z.string().min(1)])
        .optional()
        .describe('User ID or email from list_users. Provide either userId or leadId.'),
      statuses: z
        .array(z.enum(['todo', 'standby', 'done']))
        .min(1)
        .optional()
        .describe('Only return processes with these statuses. Omit to retrieve all statuses.')
    })
  )
  .output(
    z.object({
      processes: z.array(
        z.object({
          processId: z.number(),
          title: z.string(),
          description: z.string().optional(),
          status: z.string(),
          leadId: z.number().optional(),
          userId: z.number().optional(),
          tags: z.array(z.string()).optional(),
          taskCount: z.number().optional(),
          doneTaskCount: z.number().optional(),
          nextActionAt: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    if ((ctx.input.leadId === undefined) === (ctx.input.userId === undefined)) {
      throw createApiServiceError(
        'Provide exactly one of leadId or userId to list post-sales processes.'
      );
    }
    let processes = await Client.fromContext(ctx).listPostSalesProcesses(ctx.input);
    return {
      output: {
        processes: processes.map(process => ({
          processId: process.id,
          title: process.title,
          description: process.description ?? undefined,
          status: process.status,
          leadId: process.lead_id ?? undefined,
          userId: process.user_id ?? undefined,
          tags: process.tags ?? undefined,
          taskCount: process.tasks_count ?? undefined,
          doneTaskCount: process.tasks_done_count ?? undefined,
          nextActionAt: process.next_action_at ?? undefined,
          createdAt: process.created_at ?? undefined,
          updatedAt: process.updated_at ?? undefined
        }))
      },
      message: `Found ${processes.length} post-sales processes.`
    };
  })
  .build();
