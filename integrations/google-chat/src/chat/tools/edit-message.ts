import { editMessage as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createGoogleChatAppClient } from '../lib/client';
import { getGoogleChatAppIdentity } from '../lib/identity';
import type { GoogleChatMessageResource } from '../lib/mappers';
import { renderGoogleChatText } from '../lib/render';
import { resolveMessageName } from '../lib/resources';
import { buildGoogleChatMessageResult } from '../lib/results';
import { googleChatAppAuthMethods, googleChatAppScopes } from '../lib/scopes';

/**
 * spaces.messages.patch with updateMask=text. With app authentication Google
 * only allows updating messages created by the calling Chat app.
 */
export let chatEditMessage = contract
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
    let text = renderGoogleChatText(ctx.input, contract.key);
    let client = createGoogleChatAppClient(ctx, {
      action: contract.key,
      channelId: space,
      messageId: name,
      ambiguous: {
        NOT_FOUND: 'chat.message.not_found',
        PERMISSION_DENIED: 'chat.message.not_editable'
      }
    });
    let updated = await client.request<GoogleChatMessageResource>(name, {
      method: 'patch',
      params: { updateMask: 'text' },
      data: { text }
    });
    let output = await buildGoogleChatMessageResult(client, identity, space, updated, {
      isMe: true
    });
    return { output, message: `Updated Google Chat message \`${name}\`.` };
  })
  .build();
