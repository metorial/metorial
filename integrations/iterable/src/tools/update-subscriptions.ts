import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { spec } from '../spec';

export let updateSubscriptions = SlateTool.create(spec, {
  name: 'Update Subscriptions',
  key: 'update_subscriptions',
  description: `Updates a user's subscription preferences in Iterable. Manage which email lists, channels, and message types a user is subscribed to or has opted out of.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email address of the user'),
      userId: z.string().optional().describe('User ID'),
      emailListIds: z
        .array(z.number())
        .optional()
        .describe('Email list IDs to subscribe the user to'),
      unsubscribedChannelIds: z
        .array(z.number())
        .optional()
        .describe('Channel IDs to unsubscribe from'),
      unsubscribedMessageTypeIds: z
        .array(z.number())
        .optional()
        .describe('Message type IDs to unsubscribe from'),
      campaignId: z.number().optional().describe('Campaign ID that prompted this change'),
      templateId: z.number().optional().describe('Template ID that prompted this change')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update succeeded'),
      message: z.string().describe('Response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IterableClient({
      token: ctx.auth.token,
      dataCenter: ctx.config.dataCenter
    });

    let result = await client.updateSubscriptions({
      email: ctx.input.email,
      userId: ctx.input.userId,
      emailListIds: ctx.input.emailListIds,
      unsubscribedChannelIds: ctx.input.unsubscribedChannelIds,
      unsubscribedMessageTypeIds: ctx.input.unsubscribedMessageTypeIds,
      campaignId: ctx.input.campaignId,
      templateId: ctx.input.templateId
    });

    return {
      output: {
        success: result.code === 'Success',
        message: result.msg || 'Subscription preferences updated.'
      },
      message: `Updated subscription preferences for **${ctx.input.email || ctx.input.userId}**.`
    };
  })
  .build();
