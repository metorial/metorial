import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getWorkOrder = SlateTool.create(spec, {
  name: 'Get Work Order',
  key: 'get_work_order',
  description: `Retrieves detailed information about a specific work order by its ID, including title, description, status, priority, assignees, asset, location, and dates. For multi-organization keys, call list_organizations and pass organizationId.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      workOrderId: z.number().describe('ID of the work order to retrieve')
    })
  )
  .output(
    z.object({
      workOrderId: z.number().describe('Work order ID'),
      title: z.string().optional().describe('Title'),
      description: z.string().optional().describe('Description'),
      status: z
        .string()
        .optional()
        .describe('Current status (OPEN, IN_PROGRESS, ON_HOLD, DONE)'),
      priority: z.string().optional().describe('Priority level'),
      workOrderType: z.string().optional().describe('Provider work order type, when set'),
      assignees: z.array(z.any()).optional().describe('Assigned users'),
      asset: z.any().optional().describe('Associated asset'),
      location: z.any().optional().describe('Associated location'),
      categories: z.array(z.any()).optional().describe('Applied categories'),
      dueDate: z.string().optional().describe('Due date'),
      completedAt: z.string().optional().describe('Completion timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    let result = await client.getWorkOrder(ctx.input.workOrderId, [
      'assignees',
      'asset',
      'location'
    ]);

    let wo = result.workOrder ?? result;

    return {
      output: {
        workOrderId: wo.id ?? undefined,
        title: wo.title ?? undefined,
        description: wo.description ?? undefined,
        status: wo.status ?? undefined,
        priority: wo.priority ?? undefined,
        workOrderType: wo.type ?? undefined,
        assignees: wo.assignees ?? undefined,
        asset: wo.asset ?? undefined,
        location: wo.location ?? undefined,
        categories: wo.categories ?? undefined,
        dueDate: wo.dueDate ?? undefined,
        completedAt: wo.completedAt ?? undefined,
        createdAt: wo.createdAt ?? undefined,
        updatedAt: wo.updatedAt ?? undefined
      },
      message: `Work order **#${wo.id}**: "${wo.title}" — status: **${wo.status}**, priority: **${wo.priority}**.`
    };
  })
  .build();
