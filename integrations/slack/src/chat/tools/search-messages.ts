import { searchMessages as contract } from '@slates/adapter-chat';
import { slackUserAuthMethods } from '../../lib/auth-methods';
import { slackActionScopes } from '../../lib/scopes';
import type { SlackMessage } from '../../lib/types';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';
import { decodeSlackCursor, encodeSlackCursor } from '../lib/cursors';
import { getSlackIdentity, mapSlackMessage } from '../lib/mappers';

export let chatSearchMessages = contract
  .implement(spec)
  .scopes(slackActionScopes.searchPublic)
  .authMethods(slackUserAuthMethods)
  .handleInvocation(async ctx => {
    let client = createSlackChatClient(ctx, { action: contract.key });
    let cursor = decodeSlackCursor(ctx.input.cursor, ctx.input.direction ?? 'backward');

    let query = ctx.input.channelId
      ? `${ctx.input.query} in:${ctx.input.channelId}`
      : ctx.input.query;

    let result = await client.searchContext({
      query,
      contentTypes: ['messages'],
      contextChannelId: ctx.input.channelId,
      sort: 'timestamp',
      sortDir: cursor.direction === 'forward' ? 'asc' : 'desc',
      limit: ctx.input.limit ?? 100,
      cursor: cursor.data.cursor
    });

    let identity = await getSlackIdentity(client);
    let matches = (result.messages ?? []) as Array<Record<string, any>>;

    let messages = await Promise.all(
      matches.map(match =>
        mapSlackMessage(
          client,
          match.channel?.id ?? ctx.input.channelId ?? '',
          {
            ...(match as unknown as SlackMessage),
            ts: match.ts ?? '0',
            channel: match.channel?.id,
            user: typeof match.user === 'string' ? match.user : match.user?.id
          },
          { identity }
        )
      )
    );

    return {
      output: {
        messages,
        nextCursor: result.nextCursor
          ? encodeSlackCursor(cursor.direction, { cursor: result.nextCursor })
          : undefined,
        raw: result
      },
      message: `Found ${messages.length} Slack message(s).`
    };
  })
  .build();
