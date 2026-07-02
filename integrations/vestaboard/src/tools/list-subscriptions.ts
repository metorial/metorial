import { SlateTool } from 'slates';
import { z } from 'zod';
import { SubscriptionClient } from '../lib/client';
import { spec } from '../spec';

export let listSubscriptions = SlateTool.create(spec, {
  name: 'List Subscriptions',
  key: 'list_subscriptions',
  description: `List all board subscriptions accessible with the current Subscription API credentials. Returns subscription IDs and associated board IDs.

Only available via the **Subscription API**. Use subscription IDs to target specific boards when sending messages.`,
  constraints: ['Only supported by the Subscription API.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      subscriptions: z
        .array(
          z.object({
            subscriptionId: z.string().describe('Unique ID of the subscription.'),
            boardId: z.string().describe('ID of the board associated with this subscription.')
          })
        )
        .describe('List of accessible board subscriptions.')
    })
  )
  .handleInvocation(async ctx => {
    let { apiType } = ctx.auth;

    if (apiType !== 'subscription') {
      throw new Error('Listing subscriptions is only available via the Subscription API.');
    }

    let client = new SubscriptionClient(ctx.auth.token, ctx.auth.apiSecret!);
    let subscriptions = await client.listSubscriptions();

    return {
      output: { subscriptions },
      message: `Found **${subscriptions.length}** subscription(s).`
    };
  })
  .build();
