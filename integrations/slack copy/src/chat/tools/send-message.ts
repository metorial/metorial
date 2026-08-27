import { ChatErrors, sendMessage as contract } from '@slates/adapter-chat';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';
import { getSlackIdentity, hydrateSlackMessageResult } from '../lib/mappers';
import { sendSlackBody } from '../lib/outgoing';

export let chatSendMessage = contract
  .implement(spec)
  .scopes(slackActionScopes.chatWrite)
  .handleInvocation(async ctx => {
    let client = createSlackChatClient(ctx, { action: contract.key });
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
    let threadTs =
      ctx.input.threadId ??
      ctx.input.reply?.reference?.threadId ??
      ctx.input.reply?.reference?.id ??
      ctx.input.reply?.id;
    let message = await sendSlackBody(client, ctx.input, {
      channelId: ctx.input.channelId,
      threadTs,
      ephemeralUserId: ctx.input.ephemeral ? ctx.input.targetUserId : undefined
    });
    let output = await hydrateSlackMessageResult(client, ctx.input.channelId, message, {
      identity: await getSlackIdentity(client)
    });
    return { output, message: `Sent Slack message \`${message.ts}\`.` };
  })
  .build();
