import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createWorkOrder = SlateTool.create(spec, {
  name: 'Create Work Order',
  key: 'create_work_order',
  description: `Creates a new work order in MaintainX. Work orders can be reactive (one-off repairs) or preventive (recurring/scheduled maintenance). Supports setting priority, assignees, associated assets, locations, categories, and due dates.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the work order'),
      description: z
        .string()
        .optional()
        .describe('Detailed description of the work to be done'),
      priority: z
        .enum(['NONE', 'LOW', 'MEDIUM', 'HIGH'])
        .optional()
        .describe('Priority level'),
      status: z
        .enum(['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'DONE'])
        .optional()
        .describe('Initial status of the work order'),
      workOrderType: z
        .enum(['REACTIVE', 'PREVENTIVE'])
        .optional()
        .describe('Type of work order'),
      assignees: z
        .array(z.number())
        .optional()
        .describe('User IDs to assign to this work order'),
      assetId: z.number().optional().describe('Asset ID to associate with this work order'),
      locationId: z.number().optional().describe('Location ID for this work order'),
      categories: z.array(z.string()).optional().describe('Category names to apply'),
      dueDate: z.string().optional().describe('Due date in ISO 8601 format'),
      procedureId: z.number().optional().describe('Procedure/checklist ID to attach'),
      teamId: z.number().optional().describe('Team ID to assign')
    })
  )
  .output(
    z.object({
      workOrderId: z.number().describe('ID of the created work order'),
      title: z.string().optional().describe('Title of the work order')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.createWorkOrder({
      title: ctx.input.title,
      description: ctx.input.description,
      priority: ctx.input.priority,
      status: ctx.input.status,
      workOrderType: ctx.input.workOrderType,
      assignees: ctx.input.assignees,
      assetId: ctx.input.assetId,
      locationId: ctx.input.locationId,
      categories: ctx.input.categories,
      dueDate: ctx.input.dueDate,
      procedureId: ctx.input.procedureId,
      teamId: ctx.input.teamId
    });

    return {
      output: {
        workOrderId: result.id ?? result.workOrder?.id,
        title: ctx.input.title
      },
      message: `Created work order **"${ctx.input.title}"** (ID: ${result.id ?? result.workOrder?.id})${ctx.input.priority ? ` with priority **${ctx.input.priority}**` : ''}.`
    };
  })
  .build();
