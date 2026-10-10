import {
  listChannelMembers as contract,
  decodeChatCursor,
  encodeCursor
} from '@slates/adapter-chat';
import { z } from 'zod';
import { BOT_FRAMEWORK_AUTH_METHOD_KEY } from '../../lib/botFramework';
import { spec } from '../../spec';
import { createTeamsBotClient } from '../lib/client';
import { buildTeamsChannel, parseConversationId, TEAMS_CHAT_PROVIDER } from '../lib/ids';
import { mapTeamsAuthor } from '../lib/mappers';

// Page size is 50-500; chats return the full roster in one page.
// https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/get-teams-context#fetch-the-roster-or-user-profile
let TEAMS_MIN_PAGE_SIZE = 50;
let DEFAULT_LIMIT = 100;

let cursorDataSchema = z.object({
  // Provider page token; absent for page one.
  token: z.string().optional(),
  // Members of that page already returned.
  offset: z.number().int().nonnegative()
});

export let chatListChannelMembers = contract
  .implement(spec)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let { baseId } = parseConversationId(ctx.input.channelId);
    let limit = ctx.input.limit ?? DEFAULT_LIMIT;

    let position: z.infer<typeof cursorDataSchema> = { offset: 0 };
    if (ctx.input.cursor) {
      position = decodeChatCursor(TEAMS_CHAT_PROVIDER, ctx.input.cursor, cursorDataSchema, {
        action
      }).data;
    }

    let client = createTeamsBotClient(ctx.auth, action, { channelId: baseId });
    // Smaller limits slice the provider page and resume from the offset.
    let pageSize = Math.max(TEAMS_MIN_PAGE_SIZE, limit);
    let page = await client.getPagedMembers(baseId, pageSize, position.token);
    let members = Array.isArray(page?.members) ? page.members : [];
    let slice = members.slice(position.offset, position.offset + limit);

    let next: z.infer<typeof cursorDataSchema> | undefined;
    if (position.offset + limit < members.length) {
      next = { token: position.token, offset: position.offset + limit };
    } else if (page?.continuationToken) {
      next = { token: page.continuationToken, offset: 0 };
    }

    let identity = client.identity;
    return {
      output: {
        authors: slice.map(member => mapTeamsAuthor(member as any, identity.appId)),
        channel: buildTeamsChannel({ conversationId: baseId, appId: identity.appId }),
        ...(next
          ? {
              nextCursor: encodeCursor(TEAMS_CHAT_PROVIDER, {
                direction: ctx.input.direction ?? 'forward',
                data: next
              })
            }
          : {}),
        raw: { continuationToken: page?.continuationToken ?? null, count: members.length }
      },
      message: `Listed ${slice.length} Teams conversation members.`
    };
  })
  .build();
