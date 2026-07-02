import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkOrders = SlateTool.create(spec, {
  name: 'List Work Orders',
  key: 'list_work_orders',
  description: `Lists work orders from MaintainX with optional filtering by status, priority, and date ranges. Supports cursor-based pagination. Returns a summary of each work order.`,
  constraints: ['Maximum 200 results per page. Use cursor for pagination.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'DONE'])
        .optional()
        .describe('Filter by status'),
      priority: z
        .enum(['NONE', 'LOW', 'MEDIUM', 'HIGH'])
        .optional()
        .describe('Filter by priority'),
      workOrderType: z
        .enum(['REACTIVE', 'PREVENTIVE'])
        .optional()
        .describe('Filter by work order type'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter: created at or after this ISO 8601 date'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter: created at or before this ISO 8601 date'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter: updated at or after this ISO 8601 date'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Filter: updated at or before this ISO 8601 date'),
      limit: z.number().optional().describe('Max results per page (1-200, default 100)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      workOrders: z
        .array(
          z.object({
            workOrderId: z.number().describe('Work order ID'),
            title: z.string().optional().describe('Title'),
            status: z.string().optional().describe('Status'),
            priority: z.string().optional().describe('Priority'),
            workOrderType: z.string().optional().describe('Type'),
            dueDate: z.string().optional().describe('Due date'),
            createdAt: z.string().optional().describe('Created at'),
            updatedAt: z.string().optional().describe('Updated at')
          })
        )
        .describe('List of work orders'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results'),
      totalCount: z.number().optional().describe('Total number of matching work orders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listWorkOrders({
      status: ctx.input.status,
      priority: ctx.input.priority,
      type: ctx.input.workOrderType,
      createdAtGte: ctx.input.createdAfter,
      createdAtLte: ctx.input.createdBefore,
      updatedAtGte: ctx.input.updatedAfter,
      updatedAtLte: ctx.input.updatedBefore,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let workOrders = (result.workOrders ?? []).map((wo: any) => ({
      workOrderId: wo.id,
      title: wo.title,
      status: wo.status,
      priority: wo.priority,
      workOrderType: wo.workOrderType,
      dueDate: wo.dueDate,
      createdAt: wo.createdAt,
      updatedAt: wo.updatedAt
    }));

    return {
      output: {
        workOrders,
        nextCursor: result.nextCursor ?? undefined,
        totalCount: result.totalCount
      },
      message: `Found **${workOrders.length}** work order(s)${result.nextCursor ? ' (more pages available)' : ''}.`
    };
  })
  .build();
