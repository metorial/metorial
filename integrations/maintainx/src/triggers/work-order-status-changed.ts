import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let workOrderStatusChanged = SlateTrigger.create(spec, {
  name: 'Work Order Status Changed',
  key: 'work_order_status_changed',
  description:
    'Triggers when a work order status is updated in MaintainX (e.g., moved to IN_PROGRESS, ON_HOLD, or DONE).'
})
  .input(
    z.object({
      workOrderId: z.number().describe('Work order ID'),
      title: z.string().optional().describe('Title'),
      status: z.string().optional().describe('Current status'),
      priority: z.string().optional().describe('Priority'),
      updatedAt: z.string().optional().describe('Update timestamp')
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
      dueDate: z.string().optional().describe('Due date'),
      completedAt: z.string().optional().describe('Completion timestamp (if done)'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId
      });

      let lastUpdatedAt = (ctx.state as any)?.lastUpdatedAt as string | undefined;
      let knownStatuses = ((ctx.state as any)?.knownStatuses as Record<string, string>) ?? {};

      let params: Record<string, any> = {
        limit: 50
      };

      if (lastUpdatedAt) {
        params.updatedAtGte = lastUpdatedAt;
      }

      let result = await client.listWorkOrders(params);
      let workOrders: any[] = result.workOrders ?? [];

      // Sort by updatedAt ascending
      workOrders.sort((a: any, b: any) => {
        let dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        let dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateA - dateB;
      });

      // Find work orders whose status has changed
      let changed = workOrders.filter((wo: any) => {
        let prevStatus = knownStatuses[String(wo.id)];
        return prevStatus !== undefined && prevStatus !== wo.status;
      });

      // Update known statuses
      let updatedKnownStatuses = { ...knownStatuses };
      for (let wo of workOrders) {
        updatedKnownStatuses[String(wo.id)] = wo.status;
      }

      let newLastUpdatedAt = lastUpdatedAt;
      if (workOrders.length > 0) {
        let lastWo = workOrders[workOrders.length - 1];
        newLastUpdatedAt = lastWo.updatedAt;
      }

      return {
        inputs: changed.map((wo: any) => ({
          workOrderId: wo.id,
          title: wo.title,
          status: wo.status,
          priority: wo.priority,
          updatedAt: wo.updatedAt
        })),
        updatedState: {
          lastUpdatedAt: newLastUpdatedAt ?? lastUpdatedAt,
          knownStatuses: updatedKnownStatuses
        }
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId
      });

      // Fetch full details for the changed work order
      let result = await client.getWorkOrder(ctx.input.workOrderId);
      let wo = result.workOrder ?? result;

      return {
        type: 'work_order.status_changed',
        id: `work_order_status_${ctx.input.workOrderId}_${ctx.input.updatedAt ?? Date.now()}`,
        output: {
          workOrderId: wo.id ?? ctx.input.workOrderId,
          title: wo.title ?? ctx.input.title,
          description: wo.description,
          status: wo.status ?? ctx.input.status,
          priority: wo.priority ?? ctx.input.priority,
          workOrderType: wo.workOrderType,
          dueDate: wo.dueDate,
          completedAt: wo.completedAt,
          createdAt: wo.createdAt,
          updatedAt: wo.updatedAt ?? ctx.input.updatedAt
        }
      };
    }
  })
  .build();
