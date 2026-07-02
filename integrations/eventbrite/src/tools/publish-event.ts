import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let publishEvent = SlateTool.create(spec, {
  name: 'Publish/Unpublish Event',
  key: 'publish_event',
  description: `Publish or unpublish an Eventbrite event. Publishing makes the event publicly visible; unpublishing removes it from public listings.`,
  instructions: ['An event must have at least one ticket class before it can be published.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.string().describe('The ID of the event to publish or unpublish.'),
      action: z
        .enum(['publish', 'unpublish'])
        .describe('Whether to publish or unpublish the event.')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('The ID of the event.'),
      published: z.boolean().describe('Whether the event is now published.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'publish') {
      await client.publishEvent(ctx.input.eventId);
    } else {
      await client.unpublishEvent(ctx.input.eventId);
    }

    return {
      output: {
        eventId: ctx.input.eventId,
        published: ctx.input.action === 'publish'
      },
      message:
        ctx.input.action === 'publish'
          ? `Event \`${ctx.input.eventId}\` has been **published**.`
          : `Event \`${ctx.input.eventId}\` has been **unpublished**.`
    };
  })
  .build();
