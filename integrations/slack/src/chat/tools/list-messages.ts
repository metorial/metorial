import { listMessages as contract } from '@slates/adapter-chat';
import type { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';
import { decodeSlackCursor, encodeSlackCursor } from '../lib/cursors';
import {
  getSlackIdentity,
  mapSlackChannel,
  mapSlackMessage,
  mapSlackThread
} from '../lib/mappers';

export let chatListMessages = contract
  .implement(spec)
  .scopes(slackActionScopes.conversationHistory)
  .handleInvocation(async ctx => {
    let client = createSlackChatClient(ctx, { action: contract.key });
    let cursor = decodeSlackCursor(ctx.input.cursor, ctx.input.direction ?? 'backward');
    let limit = ctx.input.limit ?? 100;
    let [identity, rawChannel] = await Promise.all([
      getSlackIdentity(client),
      client.getConversationInfo(ctx.input.channelId).catch(() => undefined)
    ]);
    let result: Awaited<ReturnType<SlackClient['getConversationHistory']>>;
    if (ctx.input.threadId) {
      result = await client.getConversationReplies({
        channel: ctx.input.channelId,
        ts: ctx.input.threadId,
        limit,
        cursor: cursor.data.cursor,
        latest: cursor.direction === 'backward' ? cursor.data.timestamp : undefined,
        inclusive: false
      });
    } else {
      result = await client.getConversationHistory({
        channel: ctx.input.channelId,
        limit,
        cursor: cursor.data.cursor,
        latest: cursor.direction === 'backward' ? cursor.data.timestamp : undefined,
        inclusive: false
      });
    }
    let rawMessages = ctx.input.threadId ? result.messages : [...result.messages].reverse();
    let messages = await Promise.all(
      rawMessages.map(message =>
        mapSlackMessage(client, ctx.input.channelId, message, { identity })
      )
    );
    let nextCursor = result.nextCursor
      ? encodeSlackCursor(cursor.direction, { cursor: result.nextCursor })
      : result.hasMore && rawMessages[0]?.ts
        ? encodeSlackCursor(cursor.direction, { timestamp: rawMessages[0].ts })
        : undefined;
    return {
      output: {
        messages,
        nextCursor,
        channel: rawChannel ? mapSlackChannel(rawChannel, identity.team_id) : undefined,
        thread: ctx.input.threadId
          ? mapSlackThread(ctx.input.channelId, ctx.input.threadId, rawMessages[0])
          : undefined,
        raw: result
      },
      message: `Retrieved ${messages.length} Slack message(s).`
    };
  })
  .build();
