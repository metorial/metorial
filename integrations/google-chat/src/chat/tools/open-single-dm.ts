import { openSingleDm as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createGoogleChatAppClient } from '../lib/client';
import { getGoogleChatAppIdentity } from '../lib/identity';
import { type GoogleChatSpaceResource, mapGoogleChatChannel } from '../lib/mappers';
import { resolveUserName } from '../lib/resources';
import { googleChatAppAuthMethods, googleChatAppScopes } from '../lib/scopes';

// Creating a DM as the app needs an admin-approved scope, so a missing DM is reported.
export let chatOpenSingleDm = contract
  .implement(spec)
  .scopes(googleChatAppScopes)
  .authMethods(googleChatAppAuthMethods)
  .handleInvocation(async ctx => {
    let identity = getGoogleChatAppIdentity(ctx.auth, contract.key);
    let user = resolveUserName(contract.key, ctx.input.userId);
    let client = createGoogleChatAppClient(ctx, {
      action: contract.key,
      userId: user,
      ambiguous: { NOT_FOUND: 'chat.access.dm_not_allowed' }
    });
    let raw = await client.request<GoogleChatSpaceResource>('spaces:findDirectMessage', {
      method: 'get',
      params: { name: user }
    });
    let channel = mapGoogleChatChannel(raw, identity, {
      recipient: { name: user, type: 'HUMAN' }
    });
    return {
      output: { channel, raw },
      message: `Found the direct message \`${channel.id}\` with \`${user}\`.`
    };
  })
  .build();
