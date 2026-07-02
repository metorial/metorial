import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List all tracked event types in your Gist workspace. Returns the names and IDs of all custom events that have been tracked.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      events: z.array(
        z.object({
          eventId: z.string(),
          eventName: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });
    let data = await client.listEvents();
    let events = (data.events || []).map((e: any) => ({
      eventId: String(e.id),
      eventName: e.name
    }));

    return {
      output: { events },
      message: `Found **${events.length}** event types.`
    };
  })
  .build();
