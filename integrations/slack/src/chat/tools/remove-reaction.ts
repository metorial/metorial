import { removeReaction as contract, toSlackShortcode } from '@slates/adapter-chat';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';

export let chatRemoveReaction = contract
  .implement(spec)
  .scopes(slackActionScopes.reactionsWrite)
  .handleInvocation(async ctx => {
    let client = createSlackChatClient(ctx, { action: contract.key });
    let name = toSlackShortcode(ctx.input.emoji);
    await client.removeReaction({
      channel: ctx.input.channelId,
      timestamp: ctx.input.messageId,
      name
    });
    return {
      output: {
        ok: true,
        raw: { name, channel: ctx.input.channelId, timestamp: ctx.input.messageId }
      },
      message: `Removed :${name}: from Slack message \`${ctx.input.messageId}\`.`
    };
  })
  .build();
