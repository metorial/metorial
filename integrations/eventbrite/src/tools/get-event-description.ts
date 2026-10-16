import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEventDescription = SlateTool.create(spec, {
  name: 'Get Full Event Description',
  key: 'get_event_description',
  description:
    'Retrieve the fully rendered HTML description for an event, including descriptions created with the current event editor. The description field on get_event can contain only the summary.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      eventId: z.string().describe('Event ID. Call list_events to discover event IDs.')
    })
  )
  .output(
    z.object({
      eventId: z.string(),
      description: z.string().describe('Fully rendered HTML event description.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getEventDescription(
      ctx.input.eventId
    );
    if (typeof result.description !== 'string')
      throw createApiServiceError('Eventbrite did not return an HTML event description.');
    return {
      output: { eventId: ctx.input.eventId, description: result.description },
      message: `Retrieved the full description for event \`${ctx.input.eventId}\`.`
    };
  })
  .build();
