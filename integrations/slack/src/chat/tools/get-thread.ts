import { getThread as contract } from '@slates/adapter-chat';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';
import { getSlackIdentity, mapSlackChannel, mapSlackThread } from '../lib/mappers';

export let chatGetThread = contract
  .implement(spec)
  .scopes(slackActionScopes.conversationHistory)
  .handleInvocation(async ctx => {
    let client = createSlackChatClient(ctx, {
      action: contract.key,
      context: { threadId: ctx.input.threadId },
      ambiguous: { thread_not_found: 'chat.thread.not_found' }
    });
    let [replies, rawChannel, identity, permalink] = await Promise.all([
      client.getConversationReplies({
        channel: ctx.input.channelId,
        ts: ctx.input.threadId,
        limit: 1
      }),
      client.getConversationInfo(ctx.input.channelId).catch(() => undefined),
      getSlackIdentity(client),
      client
        .getPermalink({ channel: ctx.input.channelId, messageTs: ctx.input.threadId })
        .catch(() => undefined)
    ]);
    let root = replies.messages[0];
    return {
      output: {
        thread: mapSlackThread(ctx.input.channelId, ctx.input.threadId, root, permalink),
        channel: rawChannel ? mapSlackChannel(rawChannel, identity.team_id) : undefined,
        raw: replies
      },
      message: `Retrieved Slack thread \`${ctx.input.threadId}\`.`
    };
  })
  .build();
