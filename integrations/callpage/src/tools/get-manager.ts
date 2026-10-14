import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

export let getManager = SlateTool.create(spec, {
  name: 'Get Manager',
  key: 'get_manager',
  description:
    'Retrieve a user’s manager assignment on a widget, including enabled state, departments, and business hours. Use list_widgets and list_users to find the widget and user IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      widgetId: z.number().describe('Widget ID from list_widgets'),
      userId: z
        .number()
        .describe('User ID from list_users or the user record in list_managers')
    })
  )
  .output(
    z.object({
      manager: z
        .any()
        .describe('Manager assignment with ID, user details, departments, and business hours')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });
    let manager = await client.getManager(ctx.input.widgetId, ctx.input.userId);
    return {
      output: { manager },
      message: `Retrieved the manager assignment for user **#${ctx.input.userId}** on widget **#${ctx.input.widgetId}**.`
    };
  })
  .build();
