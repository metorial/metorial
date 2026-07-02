import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createActivity = SlateTool.create(spec, {
  name: 'Create Activity',
  key: 'create_activity',
  description: `Create a new activity (task, call, meeting, etc.) in Salesmate. Activities can be associated with contacts, companies, or deals to track sales actions.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Activity title (required)'),
      owner: z.number().describe('User ID of the activity owner'),
      type: z.string().describe('Activity type (e.g., "Call", "Task", "Meeting", "Demo")'),
      dueDate: z.string().optional().describe('Due date in ISO 8601 format'),
      duration: z.number().optional().describe('Duration in minutes'),
      isCalendarInvite: z.boolean().optional().describe('Whether to create a calendar invite'),
      isCompleted: z
        .boolean()
        .optional()
        .describe('Whether the activity is already completed'),
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
      activityId: z.number().describe('ID of the created activity')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { customFields, ...fields } = ctx.input;
    let data = { ...fields, ...customFields };
    let result = await client.createActivity(data);
    let activityId = result?.Data?.id;

    return {
      output: { activityId },
      message: `Activity **${ctx.input.title}** created with ID \`${activityId}\`.`
    };
  })
  .build();
