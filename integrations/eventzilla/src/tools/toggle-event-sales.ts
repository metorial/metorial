import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireText } from '../lib/responses';
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
      raw: z.unknown().optional().describe('Complete response returned by Eventzilla'),
      eventStatus: z.string().describe('Updated event status (published/unpublished)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.toggleSales(ctx.input.eventId, ctx.input.publish);

    return {
      output: {
        raw: data,
        eventStatus: requireText(data.eventstatus, 'event sales status')
      },
      message: `Eventzilla returned sales status **${data.eventstatus}** for event ${ctx.input.eventId}.`
    };
  })
  .build();
