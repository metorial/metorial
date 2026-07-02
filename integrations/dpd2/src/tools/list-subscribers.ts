import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubscribers = SlateTool.create(spec, {
  name: 'List Subscribers',
  key: 'list_subscribers',
  description: `Retrieve subscribers for a specific subscription storefront. Optionally filter by subscriber username (email). Subscribers are users with recurring subscription access to DPD-hosted content areas.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      storefrontId: z
        .number()
        .describe(
          'The storefront ID to list subscribers for (must be a subscription-type storefront)'
        ),
      username: z.string().optional().describe('Filter by subscriber email/username')
    })
  )
  .output(
    z.object({
      subscribers: z.array(
        z.object({
          subscriberId: z.number().describe('Unique subscriber ID'),
          username: z.string().describe('Subscriber email/username')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let subscribers = await client.listSubscribers(ctx.input.storefrontId, ctx.input.username);

    return {
      output: { subscribers },
      message: `Found **${subscribers.length}** subscriber(s) in storefront ${ctx.input.storefrontId}.`
    };
  })
  .build();
