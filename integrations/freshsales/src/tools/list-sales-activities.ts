import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listSalesActivities = SlateTool.create(spec, {
  name: 'List Sales Activities',
  key: 'list_sales_activities',
  description: `List sales activities from Freshsales with optional pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of sales activities to return per page')
    })
  )
  .output(
    z.object({
      salesActivities: z.array(
        z.object({
          activityId: z.number(),
          title: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
          salesActivityTypeId: z.number().nullable().optional(),
          salesActivityOutcomeId: z.number().nullable().optional(),
          targetableId: z.number().nullable().optional(),
          targetableType: z.string().nullable().optional(),
          startDate: z.string().nullable().optional(),
          endDate: z.string().nullable().optional(),
          ownerId: z.number().nullable().optional(),
          location: z.string().nullable().optional(),
          createdAt: z.string().nullable().optional(),
          updatedAt: z.string().nullable().optional()
        })
      ),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listSalesActivities({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let salesActivities = result.salesActivities.map((activity: Record<string, any>) => ({
      activityId: activity.id,
      title: activity.title,
      notes: activity.notes,
      salesActivityTypeId: activity.sales_activity_type_id,
      salesActivityOutcomeId: activity.sales_activity_outcome_id,
      targetableId: activity.targetable_id,
      targetableType: activity.targetable_type,
      startDate: activity.start_date,
      endDate: activity.end_date,
      ownerId: activity.owner_id,
      location: activity.location,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at
    }));

    return {
      output: {
        salesActivities,
        total: result.meta?.total
      },
      message: `Found **${salesActivities.length}** sales activities.`
    };
  })
  .build();
