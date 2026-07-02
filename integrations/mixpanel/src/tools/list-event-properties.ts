import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClientFromContext, requireServiceAccount } from '../lib/helpers';
import { spec } from '../spec';

export let listEventProperties = SlateTool.create(spec, {
  name: 'List Event Properties',
  key: 'list_event_properties',
  description: `List the top property names observed for a Mixpanel event, ordered by event count.`,
  constraints: ['Rate limit: 60 queries per hour, max 5 concurrent queries.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventName: z.string().describe('Event name to inspect'),
      limit: z.number().optional().describe('Maximum number of property names to return')
    })
  )
  .output(
    z.object({
      properties: z
        .array(
          z.object({
            propertyName: z.string().describe('Event property name'),
            count: z.number().describe('Number of events with this property')
          })
        )
        .describe('Top event properties')
    })
  )
  .handleInvocation(async ctx => {
    requireServiceAccount(ctx);

    let client = createClientFromContext(ctx);
    let properties = await client.listTopEventProperties({
      eventName: ctx.input.eventName,
      limit: ctx.input.limit
    });

    return {
      output: { properties },
      message: `Found **${properties.length}** top propert${
        properties.length === 1 ? 'y' : 'ies'
      } for event **${ctx.input.eventName}**.`
    };
  })
  .build();
