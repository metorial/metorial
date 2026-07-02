import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

export let listManagers = SlateTool.create(spec, {
  name: 'List Managers',
  key: 'list_managers',
  description: `Retrieve all managers assigned to a specific widget. Managers link users to widgets and have configurable business hours and department assignments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      widgetId: z.number().describe('The widget ID to list managers for'),
      limit: z.number().optional().describe('Number of results to return (default 100)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)')
    })
  )
  .output(
    z.object({
      managers: z
        .array(z.any())
        .describe('List of manager objects with business hours and department info')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    let result = await client.getManagers({
      widgetId: ctx.input.widgetId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: { managers: result.managers },
      message: `Retrieved **${result.managers.length}** managers for widget **#${ctx.input.widgetId}**.`
    };
  })
  .build();
