import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClientFromContext, requireServiceAccount } from '../lib/helpers';
import { spec } from '../spec';

export let listEventPropertyValues = SlateTool.create(spec, {
  name: 'List Event Property Values',
  key: 'list_event_property_values',
  description: `List the top observed values for a property on a Mixpanel event.`,
  constraints: ['Rate limit: 60 queries per hour, max 5 concurrent queries.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventName: z.string().describe('Event name to inspect'),
      propertyName: z.string().describe('Property name to inspect'),
      limit: z.number().optional().describe('Maximum number of property values to return')
    })
  )
  .output(
    z.object({
      values: z.array(z.string()).describe('Top observed property values')
    })
  )
  .handleInvocation(async ctx => {
    requireServiceAccount(ctx);

    let client = createClientFromContext(ctx);
    let values = await client.listTopEventPropertyValues({
      eventName: ctx.input.eventName,
      propertyName: ctx.input.propertyName,
      limit: ctx.input.limit
    });

    return {
      output: { values },
      message: `Found **${values.length}** top value(s) for property **${ctx.input.propertyName}** on event **${ctx.input.eventName}**.`
    };
  })
  .build();
