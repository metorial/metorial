import { ChatErrors, sendMessage as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createGoogleChatAppClient } from '../lib/client';
import { getGoogleChatAppIdentity } from '../lib/identity';
import { createGoogleChatMessage } from '../lib/outgoing';
import { resolveChannelName } from '../lib/resources';
import { buildGoogleChatMessageResult } from '../lib/results';
import { googleChatAppAuthMethods, googleChatAppScopes } from '../lib/scopes';

export let chatSendMessage = contract
  .implement(spec)
  .scopes(googleChatAppScopes)
  .authMethods(googleChatAppAuthMethods)
  .handleInvocation(async ctx => {
    let identity = getGoogleChatAppIdentity(ctx.auth, contract.key);
    if (ctx.input.ephemeral && !ctx.input.targetUserId) {
      throw ChatErrors.inputInvalid({
        action: contract.key,
        message: 'targetUserId is required when ephemeral is true',
        issues: [
          {
            path: ['targetUserId'],
            code: 'required',
            message: 'Required when ephemeral is true'
          }
        ]
      });
    }
    let space = resolveChannelName(contract.key, ctx.input.channelId);
    let client = createGoogleChatAppClient(ctx, {
      action: contract.key,
      channelId: space,
      ambiguous: {
        NOT_FOUND: 'chat.channel.not_found',
        PERMISSION_DENIED: 'chat.access.not_a_member'
      }
    });
    let reference = ctx.input.reply?.reference;
    let created = await createGoogleChatMessage(client, ctx.input, {
      action: contract.key,
      space,
      threadId: ctx.input.threadId ?? reference?.threadId,
      replyToMessageId: ctx.input.reply?.id ?? reference?.id,
      privateViewerUserId: ctx.input.ephemeral ? ctx.input.targetUserId : undefined
    });
    let output = await buildGoogleChatMessageResult(client, identity, space, created, {
      isMe: true
    });
    return { output, message: `Sent Google Chat message \`${output.message.id}\`.` };
  })
  .build();
