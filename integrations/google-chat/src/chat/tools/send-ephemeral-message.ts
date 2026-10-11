import { sendEphemeralMessage as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createGoogleChatAppClient } from '../lib/client';
import { getGoogleChatAppIdentity } from '../lib/identity';
import { createGoogleChatMessage } from '../lib/outgoing';
import { resolveChannelName } from '../lib/resources';
import { buildGoogleChatMessageResult } from '../lib/results';
import { googleChatAppAuthMethods, googleChatAppScopes } from '../lib/scopes';

export let chatSendEphemeralMessage = contract
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
    // Native private message: only the viewer and the Chat app can see it.
    let created = await createGoogleChatMessage(client, ctx.input, {
      action: contract.key,
      space,
      threadId: ctx.input.threadId,
      privateViewerUserId: ctx.input.userId
    });
    let output = await buildGoogleChatMessageResult(client, identity, space, created, {
      isMe: true
    });
    return {
      output: { ...output, usedFallback: false },
      message: `Sent private Google Chat message \`${output.message.id}\`.`
    };
  })
  .build();
