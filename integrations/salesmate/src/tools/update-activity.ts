import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateActivity = SlateTool.create(spec, {
  name: 'Update Activity',
  key: 'update_activity',
  description: `Update an existing activity in Salesmate. Use this to reschedule, mark complete, reassign, or modify any activity field.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      activityId: z.string().describe('ID of the activity to update'),
      title: z.string().optional().describe('Activity title'),
      owner: z.number().optional().describe('User ID of the activity owner'),
      type: z.string().optional().describe('Activity type'),
      dueDate: z.string().optional().describe('Due date in ISO 8601 format'),
      duration: z.number().optional().describe('Duration in minutes'),
      isCalendarInvite: z.boolean().optional().describe('Whether to create a calendar invite'),
      isCompleted: z.boolean().optional().describe('Whether the activity is completed'),
      description: z.string().optional().describe('Activity description'),
      tags: z.string().optional().describe('Comma-separated tags'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      activityId: z.string().describe('ID of the updated activity')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { activityId, customFields, ...fields } = ctx.input;

    let updateData: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    if (customFields) {
      Object.assign(updateData, customFields);
    }

    await client.updateActivity(activityId, updateData);

    return {
      output: { activityId },
      message: `Activity \`${activityId}\` updated successfully.`
    };
  })
  .build();
