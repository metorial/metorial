import { listThreads as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { decodeSlackCursor, encodeSlackCursor } from '../lib/cursors';
import { getSlackIdentity, mapSlackChannel, mapSlackThread } from '../lib/mappers';

export let chatListThreads = contract
  .implement(spec)
  .scopes(slackActionScopes.conversationHistory)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let cursor = decodeSlackCursor(ctx.input.cursor, ctx.input.direction ?? 'backward');
    let [history, identity, rawChannel] = await Promise.all([
      client.getConversationHistory({
        channel: ctx.input.channelId,
        limit: Math.min(100, (ctx.input.limit ?? 50) * 3),
        cursor: cursor.data.cursor
      }),
      getSlackIdentity(client),
      client.getConversationInfo(ctx.input.channelId).catch(() => undefined)
    ]);
    let roots = history.messages
      .filter(message => (message.reply_count ?? 0) > 0)
      .slice(0, ctx.input.limit ?? 50);
    let threads = await Promise.all(
      roots.map(async message =>
        mapSlackThread(
          ctx.input.channelId,
          message.ts,
          message,
          await client
            .getPermalink({ channel: ctx.input.channelId, messageTs: message.ts })
            .catch(() => undefined)
        )
      )
    );
    return {
      output: {
        threads,
        channel: rawChannel ? mapSlackChannel(rawChannel, identity.team_id) : undefined,
        nextCursor: history.nextCursor
          ? encodeSlackCursor('backward', { cursor: history.nextCursor })
          : undefined,
        raw: history
      },
      message: `Retrieved ${threads.length} Slack thread(s).`
    };
  })
  .build();
