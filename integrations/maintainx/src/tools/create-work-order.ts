import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createWorkOrder = SlateTool.create(spec, {
  name: 'Create Work Order',
  key: 'create_work_order',
  description: `Creates a new work order in MaintainX. Work orders can be reactive (one-off repairs) or preventive maintenance. Supports setting priority, assignees, associated assets, locations, categories, and due dates. For multi-organization keys, call list_organizations and pass organizationId.`,
  instructions: [
    'A non-OPEN status is applied after creation. If that request fails, the work order may already exist; use the workOrderId in the error with get_work_order, then retry only update_work_order with that ID and status if needed. Do not repeat creation.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
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
        .describe(
          'Requested status; non-OPEN status uses a separate request after creation. If it fails, the work order already exists; retrieve its ID from the error and retry only its status, never creation'
        ),
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
      procedureId: z.number().optional().describe('Procedure template ID to attach'),
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
    let client = Client.fromContext(ctx);

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
