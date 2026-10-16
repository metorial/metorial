import { SlateTool } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { sanitizeRaiselyLookup } from '../lib/output';
import { spec } from '../spec';

export let getSubscription = SlateTool.create(spec, {
  name: 'Get Subscription',
  key: 'get_subscription',
  description:
    'Retrieve one recurring giving subscription by UUID, including its current payment schedule and status. Use list_subscriptions to discover subscription UUIDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      subscriptionUuid: z.string().describe('Subscription UUID from list_subscriptions'),
      includePrivateData: z
        .boolean()
        .optional()
        .describe('Include private/custom field data when permitted')
    })
  )
  .output(z.object({ subscription: z.record(z.string(), z.any()) }))
  .handleInvocation(async ctx => {
    let client = new RaiselyClient({ token: ctx.auth.token });
    let result = await client.getSubscription(ctx.input.subscriptionUuid, {
      private: ctx.input.includePrivateData
    });
    return {
      output: { subscription: sanitizeRaiselyLookup(result.data, 'subscription') },
      message: `Retrieved subscription **${ctx.input.subscriptionUuid}**.`
    };
  })
  .build();
