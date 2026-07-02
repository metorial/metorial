import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSubscriberCounts = SlateTool.create(spec, {
  name: 'Get Subscriber Counts',
  key: 'get_subscriber_counts',
  description: `Retrieve subscriber counts grouped by status. Returns the total number of **active**, **unsubscribed**, and **deleted** subscribers for the newsletter.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      active: z.number().describe('Number of active subscribers'),
      unsubscribed: z.number().describe('Number of unsubscribed subscribers'),
      deleted: z.number().describe('Number of deleted subscribers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let counts = await client.getSubscriberCounts();

    let total = counts.active + counts.unsubscribed + counts.deleted;
    return {
      output: counts,
      message: `Subscriber counts: **${counts.active}** active, **${counts.unsubscribed}** unsubscribed, **${counts.deleted}** deleted (${total} total).`
    };
  })
  .build();
