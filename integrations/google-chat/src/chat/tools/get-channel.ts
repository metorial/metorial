import { getChannel as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createGoogleChatAppClient } from '../lib/client';
import { getGoogleChatAppIdentity } from '../lib/identity';
import { type GoogleChatSpaceResource, mapGoogleChatChannel } from '../lib/mappers';
import { resolveChannelName } from '../lib/resources';
import { googleChatAppAuthMethods, googleChatAppScopes } from '../lib/scopes';

export let chatGetChannel = contract
  .implement(spec)
  .scopes(googleChatAppScopes)
  .authMethods(googleChatAppAuthMethods)
  .handleInvocation(async ctx => {
    let identity = getGoogleChatAppIdentity(ctx.auth, contract.key);
    let space = resolveChannelName(contract.key, ctx.input.channelId);
    let client = createGoogleChatAppClient(ctx, {
      action: contract.key,
      channelId: space,
      ambiguous: {
        NOT_FOUND: 'chat.channel.not_found',
        PERMISSION_DENIED: 'chat.access.not_a_member'
      }
    });
    let raw = await client.request<GoogleChatSpaceResource>(space, { method: 'get' });
    let channel = mapGoogleChatChannel(raw, identity);
    return {
      output: { channel, raw },
      message: `Retrieved Google Chat space \`${channel.name ?? channel.id}\`.`
    };
  })
  .build();
