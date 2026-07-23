import { SlateTool } from 'slates';
import { z } from 'zod';
import { slackUserAuthMethods } from '../lib/auth-methods';
import { SlackClient } from '../lib/client';
import { userTokenRequiredError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let markConversationRead = SlateTool.create(spec, {
  name: 'Mark Conversation Read',
  key: 'mark_conversation_read',
  description:
    "Advance the connected Slack user's read marker in a channel, private channel, DM, or group DM to an exact message timestamp.",
  constraints: [
    'Requires a user-token connection and the write scope matching the conversation type.',
    'This does not infer unread state from search results; provide the exact timestamp to mark.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.markConversationRead)
  .authMethods(slackUserAuthMethods)
  .input(
    z.object({
      channelId: z
        .string()
        .min(1)
        .describe('Slack channel, private channel, DM, or group DM ID'),
      timestamp: z.string().min(1).describe('Exact Slack message timestamp to mark as read')
    })
  )
  .output(
    z.object({
      channelId: z.string().describe('Slack conversation ID'),
      timestamp: z.string().describe('Timestamp used for the updated read marker'),
      marked: z.boolean().describe('Whether Slack accepted the read marker update')
    })
  )
  .handleInvocation(async ctx => {
    let isUserToken =
      ctx.auth.actorType === 'user' || String(ctx.auth.token ?? '').startsWith('xoxp-');
    if (!isUserToken) {
      throw userTokenRequiredError(
        'Marking a Slack conversation as read requires a user token. Use user_oauth or user_token.'
      );
    }

    await new SlackClient(ctx.auth.token).markConversationRead(
      ctx.input.channelId,
      ctx.input.timestamp
    );

    return {
      output: {
        channelId: ctx.input.channelId,
        timestamp: ctx.input.timestamp,
        marked: true
      },
      message: `Marked Slack conversation \`${ctx.input.channelId}\` as read through \`${ctx.input.timestamp}\`.`
    };
  })
  .build();
