import { ChatErrors, replyMessage as contract } from '@slates/adapter-chat';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';
import { getSlackIdentity, hydrateSlackMessageResult } from '../lib/mappers';
import { sendSlackBody } from '../lib/outgoing';

export let chatReplyMessage = contract
  .implement(spec)
  .scopes(slackActionScopes.chatWrite)
  .handleInvocation(async ctx => {
    let client = createSlackChatClient(ctx, { action: contract.key });
    let threadTs =
      ctx.input.reply?.reference?.threadId ??
      ctx.input.reply?.reference?.id ??
      ctx.input.reply?.id;
    if (!threadTs)
      throw ChatErrors.missingTarget({
        action: contract.key,
        message: 'Slack replies require reply.id or reply.reference'
      });
    let message = await sendSlackBody(client, ctx.input, {
      channelId: ctx.input.channelId,
      threadTs
    });
    return {
      output: await hydrateSlackMessageResult(client, ctx.input.channelId, message, {
        identity: await getSlackIdentity(client)
      }),
      message: `Replied in Slack thread \`${threadTs}\`.`
    };
  })
  .build();
