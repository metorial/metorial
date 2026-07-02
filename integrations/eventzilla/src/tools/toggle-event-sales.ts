import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let toggleEventSalesTool = SlateTool.create(spec, {
  name: 'Toggle Event Sales',
  key: 'toggle_event_sales',
  description: `Publish or unpublish an event's sale page. Set **publish** to \`true\` to make the event live, or \`false\` to unpublish it.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('The event ID'),
      publish: z.boolean().describe('true to publish (make live), false to unpublish')
    })
  )
  .output(
    z.object({
      eventStatus: z.string().describe('Updated event status (published/unpublished)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.toggleSales(ctx.input.eventId, ctx.input.publish);

    return {
      output: {
        eventStatus: data.eventstatus ?? (ctx.input.publish ? 'published' : 'unpublished')
      },
      message: `Event **${ctx.input.eventId}** is now **${ctx.input.publish ? 'published' : 'unpublished'}**.`
    };
  })
  .build();
