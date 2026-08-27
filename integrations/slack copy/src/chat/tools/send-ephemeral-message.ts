import { sendEphemeralMessage as contract } from '@slates/adapter-chat';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';
import { getSlackIdentity, hydrateSlackMessageResult } from '../lib/mappers';
import { sendSlackBody } from '../lib/outgoing';

export let chatSendEphemeralMessage = contract
  .implement(spec)
  .scopes(slackActionScopes.chatWrite)
  .handleInvocation(async ctx => {
    let client = createSlackChatClient(ctx, { action: contract.key });
    let message = await sendSlackBody(client, ctx.input, {
      channelId: ctx.input.channelId,
      threadTs: ctx.input.threadId,
      ephemeralUserId: ctx.input.userId
    });
    return {
      output: {
        ...(await hydrateSlackMessageResult(client, ctx.input.channelId, message, {
          identity: await getSlackIdentity(client)
        })),
        usedFallback: false
      },
      message: `Sent an ephemeral Slack message to \`${ctx.input.userId}\`.`
    };
  })
  .build();
