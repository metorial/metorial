import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

let businessTimeSchema = z.object({
  day: z
    .enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .describe('Day of the week'),
  from: z.string().describe('Start time in HH:MM format'),
  to: z.string().describe('End time in HH:MM format'),
  timezone: z.string().optional().describe('Timezone (e.g., Europe/Warsaw)')
});

export let createManager = SlateTool.create(spec, {
  name: 'Create Manager',
  key: 'create_manager',
  description: `Add a user as a manager to a widget. Managers receive calls through the widget and can be configured with business hours for each day of the week.`,
  instructions: [
    'Default business hours are Monday-Friday 09:00-17:00 in Europe/Warsaw timezone.',
    'Business times define when the manager is available to receive calls.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.number().describe('The user ID to add as a manager'),
      widgetId: z.number().describe('The widget ID to add the manager to'),
      enabled: z.boolean().describe('Whether the manager is active and can receive calls'),
      businessTimes: z
        .array(businessTimeSchema)
        .optional()
        .describe('Custom business hours per day')
    })
  )
  .output(
    z.object({
      managerId: z.number().describe('The ID of the created manager record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    let result = await client.createManager({
      userId: ctx.input.userId,
      widgetId: ctx.input.widgetId,
      enabled: ctx.input.enabled,
      businessTimes: ctx.input.businessTimes
    });

    return {
      output: { managerId: result.managerId },
      message: `Added user **#${ctx.input.userId}** as manager **#${result.managerId}** to widget **#${ctx.input.widgetId}**.`
    };
  })
  .build();

export let updateManager = SlateTool.create(spec, {
  name: 'Update Manager',
  key: 'update_manager',
  description: `Update a manager's configuration on a widget, including enabled status and business hours.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.number().describe('The user ID of the manager'),
      widgetId: z.number().describe('The widget ID the manager belongs to'),
      enabled: z.boolean().optional().describe('Enable or disable the manager'),
      businessTimes: z
        .array(businessTimeSchema)
        .optional()
        .describe('Updated business hours per day')
    })
  )
  .output(
    z.object({
      managerId: z.number().describe('The ID of the updated manager record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    let result = await client.updateManager({
      userId: ctx.input.userId,
      widgetId: ctx.input.widgetId,
      enabled: ctx.input.enabled,
      businessTimes: ctx.input.businessTimes
    });

    return {
      output: { managerId: result.managerId },
      message: `Updated manager for user **#${ctx.input.userId}** on widget **#${ctx.input.widgetId}**.`
    };
  })
  .build();

export let deleteManager = SlateTool.create(spec, {
  name: 'Delete Manager',
  key: 'delete_manager',
  description: `Remove a manager from a widget. The user account remains but will no longer receive calls through this widget.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      widgetId: z.number().describe('The widget ID to remove the manager from'),
      userId: z.number().describe('The user ID of the manager to remove')
    })
  )
  .output(
    z.object({
      widgetId: z.number().describe('The widget the manager was removed from'),
      userId: z.number().describe('The user ID that was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    await client.deleteManager(ctx.input.widgetId, ctx.input.userId);

    return {
      output: {
        widgetId: ctx.input.widgetId,
        userId: ctx.input.userId
      },
      message: `Removed user **#${ctx.input.userId}** as manager from widget **#${ctx.input.widgetId}**.`
    };
  })
  .build();
