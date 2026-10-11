import { getMessage as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createGoogleChatAppClient } from '../lib/client';
import { getGoogleChatAppIdentity } from '../lib/identity';
import type { GoogleChatMessageResource } from '../lib/mappers';
import { resolveMessageName } from '../lib/resources';
import { buildGoogleChatMessageResult } from '../lib/results';
import { googleChatAppAuthMethods, googleChatAppScopes } from '../lib/scopes';

export let chatGetMessage = contract
  .implement(spec)
  .scopes(googleChatAppScopes)
  .authMethods(googleChatAppAuthMethods)
  .handleInvocation(async ctx => {
    let identity = getGoogleChatAppIdentity(ctx.auth, contract.key);
    let { space, name } = resolveMessageName(
      contract.key,
      ctx.input.channelId,
      ctx.input.messageId
    );
    let client = createGoogleChatAppClient(ctx, {
      action: contract.key,
      channelId: space,
      messageId: name,
      ambiguous: { NOT_FOUND: 'chat.message.not_found' }
    });
    let message = await client.request<GoogleChatMessageResource>(name, { method: 'get' });
    let output = await buildGoogleChatMessageResult(client, identity, space, message);
    return { output, message: `Retrieved Google Chat message \`${name}\`.` };
  })
  .build();
