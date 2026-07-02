import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MessagingClient } from '../lib/client';
import { firebaseActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageTopicSubscriptions = SlateTool.create(spec, {
  name: 'Manage Topic Subscriptions',
  key: 'manage_topic_subscriptions',
  description: `Subscribe or unsubscribe device tokens to/from FCM topics. Batch subscribe or unsubscribe multiple devices at once.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(firebaseActionScopes.manageTopicSubscriptions)
  .input(
    z.object({
      operation: z
        .enum(['subscribe', 'unsubscribe'])
        .describe('Whether to subscribe or unsubscribe devices'),
      topic: z.string().describe('Topic name (without /topics/ prefix)'),
      deviceTokens: z
        .array(z.string())
        .min(1)
        .max(1000)
        .describe('FCM registration tokens of devices to subscribe/unsubscribe')
    })
  )
  .output(
    z.object({
      successCount: z.number().describe('Number of tokens successfully processed'),
      failureCount: z.number().describe('Number of tokens that failed'),
      errors: z
        .array(
          z.object({
            index: z.number().describe('Index of the failed token'),
            reason: z.string().describe('Error reason')
          })
        )
        .describe('Details about failed tokens')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MessagingClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let { operation, topic, deviceTokens } = ctx.input;

    let result: any;
    if (operation === 'subscribe') {
      result = await client.subscribeToTopic(deviceTokens, topic);
    } else {
      result = await client.unsubscribeFromTopic(deviceTokens, topic);
    }

    let verb = operation === 'subscribe' ? 'subscribed to' : 'unsubscribed from';
    return {
      output: result,
      message: `**${result.successCount}** device(s) ${verb} topic "${topic}". ${result.failureCount > 0 ? `**${result.failureCount}** failed.` : ''}`
    };
  })
  .build();
