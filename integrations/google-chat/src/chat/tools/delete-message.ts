import { deleteMessage as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createGoogleChatAppClient } from '../lib/client';
import { resolveMessageName } from '../lib/resources';
import { googleChatAppAuthMethods, googleChatAppScopes } from '../lib/scopes';

/** With app authentication Google only allows deleting the app's own messages. */
export let chatDeleteMessage = contract
  .implement(spec)
  .scopes(googleChatAppScopes)
  .authMethods(googleChatAppAuthMethods)
  .handleInvocation(async ctx => {
    let { space, name } = resolveMessageName(
      contract.key,
      ctx.input.channelId,
      ctx.input.messageId
    );
    let client = createGoogleChatAppClient(ctx, {
      action: contract.key,
      channelId: space,
      messageId: name,
      ambiguous: {
        NOT_FOUND: 'chat.message.not_found',
        PERMISSION_DENIED: 'chat.message.not_deletable'
      }
    });
    let raw = await client.request<unknown>(name, { method: 'delete' });
    return { output: { ok: true, raw }, message: `Deleted Google Chat message \`${name}\`.` };
  })
  .build();
