import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newWorkOrder = SlateTrigger.create(spec, {
  name: 'New Work Order',
  key: 'new_work_order',
  description: 'Triggers when a new work order is created in MaintainX.'
})
  .input(
    z.object({
      workOrderId: z.number().describe('Work order ID'),
      title: z.string().optional().describe('Title'),
      description: z.string().optional().describe('Description'),
      status: z.string().optional().describe('Status'),
      priority: z.string().optional().describe('Priority'),
      workOrderType: z.string().optional().describe('Type'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      workOrderId: z.number().describe('Work order ID'),
      title: z.string().optional().describe('Title'),
      description: z.string().optional().describe('Description'),
      status: z.string().optional().describe('Status'),
      priority: z.string().optional().describe('Priority'),
      workOrderType: z.string().optional().describe('Type (REACTIVE or PREVENTIVE)'),
      dueDate: z.string().optional().describe('Due date'),
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

      let lastCreatedAt = (ctx.state as any)?.lastCreatedAt as string | undefined;

      let params: Record<string, any> = {
        limit: 50
      };

      if (lastCreatedAt) {
        params.createdAtGte = lastCreatedAt;
      }

      let result = await client.listWorkOrders(params);
      let workOrders: any[] = result.workOrders ?? [];

      // Sort by createdAt ascending so newest is last
      workOrders.sort((a: any, b: any) => {
        let dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        let dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });

      // Filter out work orders we've already seen (same timestamp as last poll)
      let lastSeenIds = ((ctx.state as any)?.lastSeenIds as number[]) ?? [];
      let filtered = lastCreatedAt
        ? workOrders.filter((wo: any) => {
            if (wo.createdAt > lastCreatedAt!) return true;
            if (wo.createdAt === lastCreatedAt && !lastSeenIds.includes(wo.id)) return true;
            return false;
          })
        : workOrders;

      let newLastCreatedAt = lastCreatedAt;
      let newLastSeenIds: number[] = [];

      if (filtered.length > 0) {
        let lastWo = filtered[filtered.length - 1];
        newLastCreatedAt = lastWo.createdAt;
        newLastSeenIds = filtered
          .filter((wo: any) => wo.createdAt === newLastCreatedAt)
          .map((wo: any) => wo.id);
      }

      return {
        inputs: filtered.map((wo: any) => ({
          workOrderId: wo.id,
          title: wo.title,
          description: wo.description,
          status: wo.status,
          priority: wo.priority,
          workOrderType: wo.workOrderType,
          createdAt: wo.createdAt
        })),
        updatedState: {
          lastCreatedAt: newLastCreatedAt ?? lastCreatedAt,
          lastSeenIds: newLastSeenIds.length > 0 ? newLastSeenIds : lastSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'work_order.created',
        id: `work_order_created_${ctx.input.workOrderId}`,
        output: {
          workOrderId: ctx.input.workOrderId,
          title: ctx.input.title,
          description: ctx.input.description,
          status: ctx.input.status,
          priority: ctx.input.priority,
          workOrderType: ctx.input.workOrderType,
          dueDate: undefined,
          createdAt: ctx.input.createdAt,
          updatedAt: undefined
        }
      };
    }
  })
  .build();
