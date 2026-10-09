import { listChannelMembers as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createGoogleChatAppClient } from '../lib/client';
import { getGoogleChatAppIdentity } from '../lib/identity';
import {
  type GoogleChatMembershipResource,
  mapGoogleChatAuthor,
  mapGoogleChatChannel
} from '../lib/mappers';
import { decodePageCursor, encodePageCursor, resolveChannelName } from '../lib/resources';
import { loadGoogleChatSpace } from '../lib/results';
import { googleChatAppAuthMethods, googleChatAppScopes } from '../lib/scopes';

/**
 * spaces.members.list with chat.bot lists joined user memberships in a space the
 * app belongs to; Google excludes Chat app memberships, including this app's.
 * Google Group memberships are not users and are omitted.
 */
export let chatListChannelMembers = contract
  .implement(spec)
  .scopes(googleChatAppScopes)
  .authMethods(googleChatAppAuthMethods)
  .handleInvocation(async ctx => {
    let identity = getGoogleChatAppIdentity(ctx.auth, contract.key);
    let space = resolveChannelName(contract.key, ctx.input.channelId);
    let pageToken = decodePageCursor(contract.key, ctx.input.cursor);
    let client = createGoogleChatAppClient(ctx, {
      action: contract.key,
      channelId: space,
      ambiguous: {
        NOT_FOUND: 'chat.channel.not_found',
        PERMISSION_DENIED: 'chat.access.not_a_member'
      }
    });

    let [response, rawSpace] = await Promise.all([
      client.request<{ memberships?: GoogleChatMembershipResource[]; nextPageToken?: string }>(
        `${space}/members`,
        { method: 'get', params: { pageSize: ctx.input.limit ?? 100, pageToken } }
      ),
      loadGoogleChatSpace(client, space)
    ]);

    let authors = (response.memberships ?? [])
      .filter(membership => membership.member)
      .map(membership => ({
        ...mapGoogleChatAuthor(membership.member, { isMe: false }),
        raw: membership
      }));

    return {
      output: {
        authors,
        channel: mapGoogleChatChannel(rawSpace, identity),
        nextCursor: encodePageCursor(response.nextPageToken),
        raw: response
      },
      message: `Retrieved ${authors.length} member(s) of Google Chat space \`${space}\`.`
    };
  })
  .build();
