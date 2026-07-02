import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let subscriptionTypeEnum = z.enum([
  'Email',
  'SMS',
  'iOSPush',
  'AndroidPush',
  'HuaweiPush',
  'FireOSPush',
  'WindowsPush',
  'macOSPush',
  'ChromeExtensionPush',
  'ChromePush',
  'SafariLegacyPush',
  'FirefoxPush',
  'SafariPush'
]);

let subscriptionOutputSchema = z.object({
  subscriptionId: z.string().optional().describe('Subscription ID'),
  type: z.string().optional().describe('Subscription type'),
  token: z.string().optional().describe('Push token, email, or phone number'),
  enabled: z.boolean().optional().describe('Whether subscription is active')
});

export let createSubscription = SlateTool.create(spec, {
  name: 'Create Subscription',
  key: 'create_subscription',
  description: `Add a new subscription (push device, email, or SMS) to an existing user. The user is identified by alias.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      aliasLabel: z.string().default('external_id').describe('Alias type, e.g. "external_id"'),
      aliasId: z.string().describe('Alias value of the target user'),
      type: subscriptionTypeEnum.describe('Subscription platform type'),
      token: z.string().describe('Push token, email address, or phone number'),
      enabled: z.boolean().optional().describe('Whether the subscription is enabled')
    })
  )
  .output(subscriptionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let subscription: Record<string, any> = {
      type: ctx.input.type,
      token: ctx.input.token
    };
    if (ctx.input.enabled !== undefined) subscription.enabled = ctx.input.enabled;

    let result = await client.createSubscription(
      ctx.input.aliasLabel,
      ctx.input.aliasId,
      subscription
    );

    let sub = result.subscription || result;
    return {
      output: {
        subscriptionId: sub.id,
        type: sub.type,
        token: sub.token,
        enabled: sub.enabled
      },
      message: `Created **${ctx.input.type}** subscription for user **${ctx.input.aliasId}**.`
    };
  })
  .build();

export let updateSubscription = SlateTool.create(spec, {
  name: 'Update Subscription',
  key: 'update_subscription',
  description: `Update an existing subscription's properties such as token, enabled status, or type.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subscriptionId: z.string().describe('ID of the subscription to update'),
      type: subscriptionTypeEnum.optional().describe('New subscription type'),
      token: z.string().optional().describe('New push token, email, or phone number'),
      enabled: z.boolean().optional().describe('Enable or disable the subscription')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let subscription: Record<string, any> = {};
    if (ctx.input.type) subscription.type = ctx.input.type;
    if (ctx.input.token) subscription.token = ctx.input.token;
    if (ctx.input.enabled !== undefined) subscription.enabled = ctx.input.enabled;

    await client.updateSubscription(ctx.input.subscriptionId, subscription);

    return {
      output: { success: true },
      message: `Subscription **${ctx.input.subscriptionId}** updated successfully.`
    };
  })
  .build();

export let deleteSubscription = SlateTool.create(spec, {
  name: 'Delete Subscription',
  key: 'delete_subscription',
  description: `Remove a subscription (device/email/SMS) from a user permanently.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      subscriptionId: z.string().describe('ID of the subscription to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    await client.deleteSubscription(ctx.input.subscriptionId);

    return {
      output: { success: true },
      message: `Subscription **${ctx.input.subscriptionId}** deleted.`
    };
  })
  .build();

export let transferSubscription = SlateTool.create(spec, {
  name: 'Transfer Subscription',
  key: 'transfer_subscription',
  description: `Transfer a subscription from one user to another. Useful when a device changes ownership.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subscriptionId: z.string().describe('ID of the subscription to transfer'),
      targetExternalId: z.string().describe('External ID of the new owner')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the transfer was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    await client.transferSubscription(ctx.input.subscriptionId, {
      external_id: ctx.input.targetExternalId
    });

    return {
      output: { success: true },
      message: `Subscription **${ctx.input.subscriptionId}** transferred to user **${ctx.input.targetExternalId}**.`
    };
  })
  .build();
