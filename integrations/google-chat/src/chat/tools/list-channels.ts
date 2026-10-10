import { listChannels as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createGoogleChatAppClient } from '../lib/client';
import { getGoogleChatAppIdentity } from '../lib/identity';
import { type GoogleChatSpaceResource, mapGoogleChatChannel } from '../lib/mappers';
import { decodePageCursor, encodePageCursor } from '../lib/resources';
import { googleChatAppAuthMethods, googleChatAppScopes } from '../lib/scopes';

let SPACE_TYPE_FILTERS: Record<string, string> = {
  dm: 'spaceType = "DIRECT_MESSAGE"',
  group_dm: 'spaceType = "GROUP_CHAT"',
  public: 'spaceType = "SPACE"',
  private: 'spaceType = "SPACE"',
  shared: 'spaceType = "SPACE"'
};

// Filters apply per page, so a page can be empty while nextCursor continues.
export let chatListChannels = contract
  .implement(spec)
  .scopes(googleChatAppScopes)
  .authMethods(googleChatAppAuthMethods)
  .handleInvocation(async ctx => {
    let identity = getGoogleChatAppIdentity(ctx.auth, contract.key);
    if (ctx.input.workspaceId && ctx.input.workspaceId !== identity.workspaceId) {
      return {
        output: { channels: [], raw: { spaces: [] } },
        message: 'No Google Chat spaces belong to that workspace.'
      };
    }

    let pageToken = decodePageCursor(contract.key, ctx.input.cursor);
    let type = ctx.input.type;
    let filter = type ? SPACE_TYPE_FILTERS[type] : undefined;
    if (type && !filter) {
      return {
        output: { channels: [], raw: { spaces: [] } },
        message: `Google Chat has no ${type} spaces.`
      };
    }

    let client = createGoogleChatAppClient(ctx, { action: contract.key });
    let response = await client.request<{
      spaces?: GoogleChatSpaceResource[];
      nextPageToken?: string;
    }>('spaces', {
      method: 'get',
      params: { pageSize: ctx.input.limit ?? 100, pageToken, filter }
    });

    let query = ctx.input.query?.trim().toLowerCase();
    let channels = (response.spaces ?? [])
      .map(space => mapGoogleChatChannel(space, identity))
      // dm/group_dm are filtered by Google; space access types are matched locally.
      .filter(channel => !type || channel.type === type)
      .filter(
        channel =>
          !query ||
          channel.name?.toLowerCase().includes(query) ||
          channel.id.toLowerCase().includes(query)
      );

    return {
      output: {
        channels,
        nextCursor: encodePageCursor(response.nextPageToken),
        raw: response
      },
      message: `Retrieved ${channels.length} Google Chat space(s).`
    };
  })
  .build();
