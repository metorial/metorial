import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageSalesActivity = SlateTool.create(spec, {
  name: 'Manage Sales Activity',
  key: 'manage_sales_activity',
  description: `Create or update a sales activity in Freshsales. Sales activities track calls, emails, and custom activities associated with leads, contacts, deals, or accounts.
Use the **listSelectors** tool to find valid activity type and outcome IDs.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      activityId: z
        .number()
        .optional()
        .describe('ID of the activity to update. Omit to create.'),
      title: z.string().optional().describe('Activity title'),
      notes: z.string().optional().describe('Activity notes/description'),
      salesActivityTypeId: z
        .number()
        .optional()
        .describe('Activity type ID (use listSelectors to find valid IDs)'),
      salesActivityOutcomeId: z.number().optional().describe('Activity outcome ID'),
      targetableId: z.number().optional().describe('ID of the associated record'),
      targetableType: z
        .enum(['Contact', 'Lead', 'Deal', 'SalesAccount'])
        .optional()
        .describe('Type of the associated record'),
      startDate: z.string().optional().describe('Start date/time in ISO format'),
      endDate: z.string().optional().describe('End date/time in ISO format'),
      ownerId: z.number().optional().describe('Assigned user ID'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      activityId: z.number().describe('ID of the sales activity'),
      title: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      salesActivityTypeId: z.number().nullable().optional(),
      targetableId: z.number().nullable().optional(),
      targetableType: z.string().nullable().optional(),
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let activityData: Record<string, any> = {};
    if (ctx.input.title !== undefined) activityData.title = ctx.input.title;
    if (ctx.input.notes !== undefined) activityData.notes = ctx.input.notes;
    if (ctx.input.salesActivityTypeId !== undefined)
      activityData.sales_activity_type_id = ctx.input.salesActivityTypeId;
    if (ctx.input.salesActivityOutcomeId !== undefined)
      activityData.sales_activity_outcome_id = ctx.input.salesActivityOutcomeId;
    if (ctx.input.targetableId !== undefined)
      activityData.targetable_id = ctx.input.targetableId;
    if (ctx.input.targetableType !== undefined)
      activityData.targetable_type = ctx.input.targetableType;
    if (ctx.input.startDate !== undefined) activityData.start_date = ctx.input.startDate;
    if (ctx.input.endDate !== undefined) activityData.end_date = ctx.input.endDate;
    if (ctx.input.ownerId !== undefined) activityData.owner_id = ctx.input.ownerId;
    if (ctx.input.customFields) activityData.custom_field = ctx.input.customFields;

    let activity: Record<string, any>;
    let action: string;

    if (ctx.input.activityId) {
      activity = await client.updateSalesActivity(ctx.input.activityId, activityData);
      action = 'updated';
    } else {
      activity = await client.createSalesActivity(activityData);
      action = 'created';
    }

    return {
      output: {
        activityId: activity.id,
        title: activity.title,
        notes: activity.notes,
        salesActivityTypeId: activity.sales_activity_type_id,
        targetableId: activity.targetable_id,
        targetableType: activity.targetable_type,
        startDate: activity.start_date,
        endDate: activity.end_date,
        createdAt: activity.created_at,
        updatedAt: activity.updated_at
      },
      message: `Sales activity **${activity.title || activity.id}** ${action} successfully.`
    };
  })
  .build();
