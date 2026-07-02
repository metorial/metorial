import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

export let deleteWidget = SlateTool.create(spec, {
  name: 'Delete Widget',
  key: 'delete_widget',
  description: `Permanently delete a widget and all its associated configuration, managers, and settings.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      widgetId: z.number().describe('The ID of the widget to delete')
    })
  )
  .output(
    z.object({
      widgetId: z.number().describe('The ID of the deleted widget')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    await client.deleteWidget(ctx.input.widgetId);

    return {
      output: { widgetId: ctx.input.widgetId },
      message: `Deleted widget **#${ctx.input.widgetId}**.`
    };
  })
  .build();
