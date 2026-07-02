import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let suspendWidgetUser = SlateTool.create(spec, {
  name: 'Suspend Widget User',
  key: 'suspend_widget_user',
  description: `Suspend a user from a NiftyImages widget or Bee Plugin integration. Suspended users will no longer be able to use the widget tools.
Use this for managing ESP integrations where you need to control access to the embedded NiftyImages tools.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      source: z
        .enum(['widget', 'bee_plugin'])
        .describe('Whether the user belongs to a Widget or Bee Plugin integration.'),
      widgetKey: z
        .string()
        .optional()
        .describe('The widget key (required when source is "widget").'),
      userId: z.string().describe('The user identifier to suspend.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the user was suspended successfully.'),
      result: z.any().optional().describe('The API response data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.source === 'widget') {
      if (!ctx.input.widgetKey) {
        throw new Error('Widget key is required when suspending a widget user.');
      }
      let result = await client.suspendWidgetUser(ctx.input.widgetKey, ctx.input.userId);
      return {
        output: { success: true, result },
        message: `Successfully suspended user **${ctx.input.userId}** from widget **${ctx.input.widgetKey}**.`
      };
    }

    let result = await client.suspendBeePluginUser(ctx.input.userId);
    return {
      output: { success: true, result },
      message: `Successfully suspended Bee Plugin user **${ctx.input.userId}**.`
    };
  })
  .build();
