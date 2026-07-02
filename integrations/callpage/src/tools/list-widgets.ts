import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

export let listWidgets = SlateTool.create(spec, {
  name: 'List Widgets',
  key: 'list_widgets',
  description: `Retrieve all widgets with their configuration, managers, and business hours. Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of results to return (default 100)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)')
    })
  )
  .output(
    z.object({
      widgets: z
        .array(z.any())
        .describe('List of widget objects with settings, managers, and business times')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    let result = await client.getWidgets({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: { widgets: result.widgets },
      message: `Retrieved **${result.widgets.length}** widgets.`
    };
  })
  .build();
