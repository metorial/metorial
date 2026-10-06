import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifySubscriber = SlateTool.create(spec, {
  name: 'Verify Subscriber',
  key: 'verify_subscriber',
  description: `Retrieve a subscriber's current subscription status within an exact storefront. Provide exactly one subscriber email or ID. This status does not independently prove current content entitlement.`,
  instructions: [
    'Apply the storefront’s current access policy to the returned status; this tool does not grant or revoke access.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      storefrontId: z.number().describe('The storefront ID to verify access for'),
      subscriberUsername: z.string().optional().describe('Subscriber email address to verify'),
      subscriberId: z.number().optional().describe('Subscriber ID to verify')
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .describe('Subscription status (ACTIVE, TRIAL, PAST_DUE, NEW, CANCELED, CLOSED)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.verifySubscriber(ctx.input.storefrontId, {
      username: ctx.input.subscriberUsername,
      subscriberId: ctx.input.subscriberId
    });

    return {
      output: result,
      message: `Subscriber verification result: **${result.status}**.`
    };
  })
  .build();
