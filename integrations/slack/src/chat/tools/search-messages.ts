import { searchMessages as contract } from '@slates/adapter-chat';
import { slackUserAuthMethods } from '../../lib/auth-methods';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import type { SlackMessage } from '../../lib/types';
import { spec } from '../../spec';
import { decodeSlackCursor, encodeSlackCursor } from '../lib/cursors';
import { getSlackIdentity, mapSlackMessage } from '../lib/mappers';

export let chatSearchMessages = contract
  .implement(spec)
  .scopes(slackActionScopes.search)
  .authMethods(slackUserAuthMethods)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let cursor = decodeSlackCursor(ctx.input.cursor, ctx.input.direction ?? 'backward');
    let page = cursor.data.page ?? 1;
    let query = ctx.input.channelId
      ? `${ctx.input.query} in:${ctx.input.channelId}`
      : ctx.input.query;
    let result = await client.searchMessages({
      query,
      sort: 'timestamp',
      sortDir: cursor.direction === 'forward' ? 'asc' : 'desc',
      count: ctx.input.limit ?? 100,
      page
    });
    let identity = await getSlackIdentity(client);
    let matches = result.messages.matches as any[];
    let messages = await Promise.all(
      matches.map(match =>
        mapSlackMessage(
          client,
          match.channel?.id ?? ctx.input.channelId ?? '',
          {
            ...(match as SlackMessage),
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
        nextCursor:
          page * (ctx.input.limit ?? 100) < result.messages.total
            ? encodeSlackCursor(cursor.direction, { page: page + 1 })
            : undefined,
        raw: result
      },
      message: `Found ${result.messages.total} Slack message(s).`
    };
  })
  .build();
