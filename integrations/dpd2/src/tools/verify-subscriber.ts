import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifySubscriber = SlateTool.create(spec, {
  name: 'Verify Subscriber',
  key: 'verify_subscriber',
  description: `Check whether a subscriber currently has active access to a subscription storefront. Returns the subscriber's subscription status. Provide either the subscriber's email or ID.`,
  instructions: ['Statuses indicating valid service access: ACTIVE, TRIAL, PAST_DUE.'],
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
