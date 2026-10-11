import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { gumroadActionScopes } from '../lib/scopes';
import { spec } from '../spec';
import { mapSubscriber, subscriberSchema } from './subscriber-utils';

export let getSubscriber = SlateTool.create(spec, {
  name: 'Get Subscriber',
  key: 'get_subscriber',
  description: `Retrieve detailed information about a specific Gumroad subscriber by their subscriber ID.`,
  tags: {
    readOnly: true
  }
})
  .scopes(gumroadActionScopes.viewSales)
  .input(
    z.object({
      subscriberId: z.string().describe('The subscriber ID to retrieve')
    })
  )
  .output(subscriberSchema)
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let s = await client.getSubscriber(ctx.input.subscriberId);

    return {
      output: mapSubscriber(s),
      message: `Retrieved subscriber **${s.id}** (${s.email || s.user_email || 'no email'}).`
    };
  })
  .build();
