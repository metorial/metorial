import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWorkOrder = SlateTool.create(spec, {
  name: 'Get Work Order',
  key: 'get_work_order',
  description: `Retrieves detailed information about a specific work order by its ID, including title, description, status, priority, assignees, asset, location, and dates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
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
      workOrderType: z.string().optional().describe('Type (REACTIVE or PREVENTIVE)'),
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
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.getWorkOrder(ctx.input.workOrderId, [
      'assignees',
      'asset',
      'categories'
    ]);

    let wo = result.workOrder ?? result;

    return {
      output: {
        workOrderId: wo.id,
        title: wo.title,
        description: wo.description,
        status: wo.status,
        priority: wo.priority,
        workOrderType: wo.workOrderType,
        assignees: wo.assignees,
        asset: wo.asset,
        location: wo.location,
        categories: wo.categories,
        dueDate: wo.dueDate,
        completedAt: wo.completedAt,
        createdAt: wo.createdAt,
        updatedAt: wo.updatedAt
      },
      message: `Work order **#${wo.id}**: "${wo.title}" — status: **${wo.status}**, priority: **${wo.priority}**.`
    };
  })
  .build();
