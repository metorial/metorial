import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getSalesActivity = SlateTool.create(spec, {
  name: 'Get Sales Activity',
  key: 'get_sales_activity',
  description: `Retrieve a single sales activity by ID from Freshsales.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      activityId: z.number().describe('ID of the sales activity to retrieve')
    })
  )
  .output(
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
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let activity = await client.getSalesActivity(ctx.input.activityId);

    return {
      output: {
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
      },
      message: `Retrieved sales activity **${activity.title || activity.id}**.`
    };
  })
  .build();
