import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { subscriberSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getSubscriber = SlateTool.create(spec, {
  name: 'Get Subscriber',
  key: 'get_subscriber',
  description: `Retrieve detailed information about a specific subscriber in a subscription storefront, including subscription status, pricing, trial details, and payment schedule.`,
  instructions: [
    'Interpret subscription status using the storefront’s current entitlement policy.',
    'Other statuses: NEW (checkout in progress), CANCELED (current term not ended), CLOSED (canceled and ended).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      storefrontId: z.number().describe('The storefront ID the subscriber belongs to'),
      subscriberId: z.number().describe('The unique ID of the subscriber to retrieve')
    })
  )
  .output(subscriberSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let subscriber = await client.getSubscriber(
      ctx.input.storefrontId,
      ctx.input.subscriberId
    );

    return {
      output: subscriber,
      message: `Retrieved subscriber #${subscriber.subscriberId}.`
    };
  })
  .build();
