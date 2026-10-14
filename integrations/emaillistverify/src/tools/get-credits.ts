import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCredits = SlateTool.create(spec, {
  name: 'Get Credit Balance',
  key: 'get_credits',
  description:
    'Check available on-demand and subscription credits before verifying an email or uploading a list. This request consumes no credits.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      onDemand: z.object({
        available: z.number().describe('Available credits that do not expire')
      }),
      subscription: z
        .object({
          available: z.number().describe('Available subscription credits'),
          expiresAt: z.string().describe('Subscription period expiration in ISO 8601 format')
        })
        .nullable()
    })
  )
  .handleInvocation(async ctx => {
    let output = await new Client({ token: ctx.auth.token }).getCredits();
    return {
      output,
      message: `Available credits: **${output.onDemand.available}** on-demand${output.subscription ? ` and **${output.subscription.available}** subscription` : ''}.`
    };
  })
  .build();
