import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

export let addUsersToWidget = SlateTool.create(spec, {
  name: 'Add Users to Widget',
  key: 'add_users_to_widget',
  description: `Add one or more users to a widget as managers. This automatically creates manager records for the users. Optionally configure business hours during assignment.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      widgetId: z.number().describe('The widget ID to add users to'),
      userIds: z.array(z.number()).describe('Array of user IDs to add as managers'),
      businessTimes: z
        .array(z.any())
        .optional()
        .describe('Business hours configuration for the new managers')
    })
  )
  .output(
    z.object({
      assignments: z
        .array(
          z.object({
            userId: z.number().describe('The assigned user ID'),
            managerId: z.number().describe('The created manager record ID')
          })
        )
        .describe('List of user-to-manager assignments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    let assignments = await client.addUsersToWidget({
      widgetId: ctx.input.widgetId,
      userIds: ctx.input.userIds,
      businessTimes: ctx.input.businessTimes
    });

    return {
      output: { assignments },
      message: `Added **${assignments.length}** user(s) to widget **#${ctx.input.widgetId}**.`
    };
  })
  .build();
