import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let unsubscribe = SlateTool.create(spec, {
  name: 'Unsubscribe',
  key: 'unsubscribe',
  description: `Unsubscribe a subscriber from your Kit emails. This sets their state to "cancelled".`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      subscriberId: z.number().describe('The subscriber ID to unsubscribe')
    })
  )
  .output(
    z.object({
      subscriberId: z.number().describe('Unique subscriber ID'),
      emailAddress: z.string().describe('Subscriber email address'),
      state: z.string().describe('Updated subscriber state')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.unsubscribeSubscriber(ctx.input.subscriberId);
    let s = data.subscriber;

    return {
      output: {
        subscriberId: s.id,
        emailAddress: s.email_address,
        state: s.state
      },
      message: `Unsubscribed **${s.email_address}**. State is now \`${s.state}\`.`
    };
  })
  .build();
