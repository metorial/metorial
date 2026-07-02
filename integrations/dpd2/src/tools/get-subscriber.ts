import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSubscriber = SlateTool.create(spec, {
  name: 'Get Subscriber',
  key: 'get_subscriber',
  description: `Retrieve detailed information about a specific subscriber in a subscription storefront, including subscription status, pricing, trial details, and payment schedule.`,
  instructions: [
    'Valid subscription statuses for active service: ACTIVE, TRIAL, PAST_DUE.',
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
  .output(
    z.object({
      subscriberId: z.number().describe('Unique subscriber ID'),
      username: z.string().describe('Subscriber email/username'),
      subscription: z
        .object({
          subscriptionId: z.number().describe('Subscription ID'),
          status: z
            .string()
            .describe('Subscription status (NEW, TRIAL, ACTIVE, CANCELED, CLOSED, PAST_DUE)'),
          price: z.string().describe('Subscription price'),
          period: z.number().describe('Billing period'),
          unit: z.string().describe('Billing period unit'),
          taxAmount: z.string().describe('Tax amount per billing cycle'),
          trialTaxAmount: z.string().describe('Tax amount during trial'),
          trialPrice: z.string().describe('Trial period price'),
          trialPeriod: z.number().describe('Trial duration'),
          trialUnit: z.string().describe('Trial duration unit'),
          createdAt: z.number().describe('Subscription creation timestamp (UNIX)'),
          updatedAt: z.number().describe('Subscription last updated timestamp (UNIX)'),
          startedAt: z.number().describe('Subscription start timestamp (UNIX)'),
          endedAt: z
            .number()
            .nullable()
            .describe('Subscription end timestamp (UNIX) or null if active'),
          trialStartedAt: z
            .number()
            .nullable()
            .describe('Trial start timestamp (UNIX) or null'),
          lastPaymentAt: z.number().describe('Last payment timestamp (UNIX)'),
          nextPaymentAt: z.number().describe('Next payment due timestamp (UNIX)')
        })
        .describe('Subscription details'),
      createdAt: z.number().describe('Subscriber creation timestamp (UNIX)'),
      updatedAt: z.number().describe('Subscriber last updated timestamp (UNIX)'),
      lastLoginAt: z.number().nullable().describe('Last login timestamp (UNIX) or null')
    })
  )
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
      message: `Retrieved subscriber **${subscriber.username}** (ID: ${subscriber.subscriberId}, status: **${subscriber.subscription.status}**).`
    };
  })
  .build();
