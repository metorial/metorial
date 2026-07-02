import { SlateTool } from 'slates';
import { z } from 'zod';
import { PushoverClient } from '../lib/client';
import { spec } from '../spec';

export let migrateSubscription = SlateTool.create(spec, {
  name: 'Migrate Subscription',
  key: 'migrate_subscription',
  description: `Migrate an existing Pushover user key to a subscription-based key. This converts a direct user key into a subscription user key that can be managed through Pushover's subscription system. The returned subscription user key should be stored in place of the original user key.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subscriptionCode: z.string().describe('The subscription code from Pushover'),
      userKey: z
        .string()
        .optional()
        .describe('User key to migrate. Defaults to the authenticated user key.'),
      deviceName: z
        .string()
        .optional()
        .describe('Limit the subscription to a specific device'),
      sound: z
        .string()
        .optional()
        .describe('Preferred default notification sound for this subscription')
    })
  )
  .output(
    z.object({
      subscribedUserKey: z
        .string()
        .describe('The new subscription user key to use in place of the original user key'),
      requestId: z.string().describe('Unique request identifier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PushoverClient({
      token: ctx.auth.token,
      userKey: ctx.auth.userKey
    });

    let result = await client.migrateSubscription({
      subscription: ctx.input.subscriptionCode,
      userKey: ctx.input.userKey,
      deviceName: ctx.input.deviceName,
      sound: ctx.input.sound
    });

    return {
      output: {
        subscribedUserKey: result.subscribedUserKey,
        requestId: result.request
      },
      message: `Migrated user to subscription key \`${result.subscribedUserKey}\`.`
    };
  })
  .build();
