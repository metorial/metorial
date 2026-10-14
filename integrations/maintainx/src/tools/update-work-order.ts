import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let updateWorkOrder = SlateTool.create(spec, {
  name: 'Update Work Order',
  key: 'update_work_order',
  description: `Updates an existing work order in MaintainX. Can modify title, description, priority, status, assignees, asset, location, categories, and due date. Only provided fields will be updated. For multi-organization keys, call list_organizations and pass organizationId.`,
  instructions: [
    'Status is applied after any other fields. If its request fails, those fields may already be saved; use the workOrderId in the error with get_work_order, then retry only update_work_order with that ID and status if needed.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      workOrderId: z.number().describe('ID of the work order to update'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      priority: z
        .enum(['NONE', 'LOW', 'MEDIUM', 'HIGH'])
        .optional()
        .describe('New priority level'),
      status: z
        .enum(['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'DONE'])
        .optional()
        .describe(
          'New status, applied after other fields through a separate request. If it fails, the earlier field update already succeeded; retrieve the work order and retry only status'
        ),
      assignees: z
        .array(z.number())
        .optional()
        .describe('New assignee user IDs (replaces existing)'),
      assetId: z.number().optional().describe('New asset ID'),
      locationId: z.number().optional().describe('New location ID'),
      categories: z
        .array(z.string())
        .optional()
        .describe('New category names (replaces existing)'),
      dueDate: z.string().optional().describe('New due date in ISO 8601 format'),
      teamId: z.number().optional().describe('New team ID')
    })
  )
  .output(
    z.object({
      workOrderId: z.number().describe('ID of the updated work order'),
      title: z.string().optional().describe('Title of the work order'),
      status: z.string().optional().describe('Current status'),
      priority: z.string().optional().describe('Current priority')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    let updateData: Record<string, any> = {};
    if (ctx.input.title !== undefined) updateData.title = ctx.input.title;
    if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
    if (ctx.input.priority !== undefined) updateData.priority = ctx.input.priority;
    if (ctx.input.status !== undefined) updateData.status = ctx.input.status;
    if (ctx.input.assignees !== undefined) updateData.assignees = ctx.input.assignees;
    if (ctx.input.assetId !== undefined) updateData.assetId = ctx.input.assetId;
    if (ctx.input.locationId !== undefined) updateData.locationId = ctx.input.locationId;
    if (ctx.input.categories !== undefined) updateData.categories = ctx.input.categories;
    if (ctx.input.dueDate !== undefined) updateData.dueDate = ctx.input.dueDate;
    if (ctx.input.teamId !== undefined) updateData.teamId = ctx.input.teamId;

    let result = await client.updateWorkOrder(ctx.input.workOrderId, updateData);

    let wo = result.workOrder ?? result;

    return {
      output: {
        workOrderId: wo.id ?? ctx.input.workOrderId,
        title: wo.title ?? undefined,
        status: wo.status ?? undefined,
        priority: wo.priority ?? undefined
      },
      message: `Updated work order **#${ctx.input.workOrderId}**${ctx.input.status ? ` — status set to **${ctx.input.status}**` : ''}.`
    };
  })
  .build();
