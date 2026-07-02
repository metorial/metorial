import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEventDefinitions = SlateTool.create(spec, {
  name: 'List Event Definitions',
  key: 'list_event_definitions',
  description: `Lists all event definitions configured in the account. Event definitions describe the types of events being tracked (e.g. "Flow Started", "Checklist Task Completed"). Useful for understanding which events are available for segmentation and targeting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of event definitions to return'),
      startingAfter: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      eventDefinitions: z
        .array(
          z.object({
            eventDefinitionId: z.string().describe('ID of the event definition'),
            name: z.string().describe('Internal name of the event (e.g. flow_started)'),
            displayName: z.string().describe('Human-readable display name'),
            description: z.string().nullable().describe('Description of the event'),
            createdAt: z.string().describe('Timestamp when the definition was created')
          })
        )
        .describe('List of event definitions'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.listEventDefinitions({
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter
    });

    let eventDefinitions = result.data.map(ed => ({
      eventDefinitionId: ed.id,
      name: ed.name,
      displayName: ed.display_name,
      description: ed.description,
      createdAt: ed.created_at
    }));

    return {
      output: {
        eventDefinitions,
        hasMore: result.has_more
      },
      message: `Retrieved **${eventDefinitions.length}** event definition(s).`
    };
  })
  .build();
