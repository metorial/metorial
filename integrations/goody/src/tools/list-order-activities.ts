import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGoodyClient } from '../lib/client';
import { spec } from '../spec';

export let listOrderActivities = SlateTool.create(spec, {
  name: 'List Order Activities',
  key: 'list_order_activities',
  description:
    'Track order status changes across the account with timestamp and status filters. Each event includes the current order state for follow-up.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number starting at 1'),
      perPage: z.number().optional().describe('Items per page from 1 to 100; defaults to 20'),
      after: z
        .string()
        .optional()
        .describe('Include activities at or after this ISO 8601 timestamp'),
      before: z
        .string()
        .optional()
        .describe('Include activities at or before this ISO 8601 timestamp'),
      statuses: z
        .array(z.string())
        .optional()
        .describe('Statuses to include, such as created, opened, shipped, or delivered')
    })
  )
  .output(
    z.object({
      activities: z.array(
        z.object({
          activityId: z.string().describe('Status change event ID'),
          orderStatus: z.string().describe('Status entered when the event occurred'),
          createdAt: z.string().describe('ISO 8601 event timestamp'),
          orderId: z.string().describe('Order ID for follow-up operations'),
          order: z
            .record(z.string(), z.unknown())
            .describe('Complete current order state; its status may be newer than the event')
        })
      ),
      totalCount: z.number().describe('Total matching events')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createGoodyClient(ctx).listOrderActivities(ctx.input);
    let activities = (result.data ?? []).map(
      (activity: {
        id: string;
        order_status: string;
        created_at: string;
        order: { id: string; [key: string]: unknown };
      }) => ({
        activityId: activity.id,
        orderStatus: activity.order_status,
        createdAt: activity.created_at,
        orderId: activity.order.id,
        order: activity.order
      })
    );
    return {
      output: { activities, totalCount: result.list_meta?.total_count ?? activities.length },
      message: `Returned **${activities.length}** order activity event(s) on this page.`
    };
  })
  .build();
