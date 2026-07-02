import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

export let getWidget = SlateTool.create(spec, {
  name: 'Get Widget',
  key: 'get_widget',
  description: `Retrieve detailed information about a specific widget, including its configuration, settings, managers, and business hours.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      widgetId: z.number().describe('The ID of the widget to retrieve')
    })
  )
  .output(
    z.object({
      widget: z
        .any()
        .describe('Full widget details including settings, managers, and business hours')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    let widget = await client.getWidget(ctx.input.widgetId);

    return {
      output: { widget },
      message: `Retrieved widget **#${ctx.input.widgetId}**.`
    };
  })
  .build();
