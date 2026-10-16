import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId, requiredText, responseList, validatePagination } from '../lib/response';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List all tracked event types in your Gist workspace. Returns the names and IDs of all custom events that have been tracked.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional(),
      perPage: z.number().optional().describe('Results per page, at most 60')
    })
  )
  .output(
    z.object({
      pages: z.any().optional(),
      rawResponse: z.any().optional().describe('Complete provider response data'),
      events: z.array(
        z.object({
          eventId: z.string(),
          eventName: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    validatePagination({ page: ctx.input.page, perPage: ctx.input.perPage });
    let client = new GistClient({ token: ctx.auth.token });
    let data = await client.listEvents({ page: ctx.input.page, per_page: ctx.input.perPage });
    let events = responseList(data.events).map((e: any) => ({
      eventId: requiredId(e.id),
      eventName: requiredText(e.name)
    }));

    return {
      output: { rawResponse: client.responses, events, pages: data.pages },
      message: `Found **${events.length}** event types.`
    };
  })
  .build();
