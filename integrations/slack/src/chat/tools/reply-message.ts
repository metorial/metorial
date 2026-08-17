import { replyMessage as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { getSlackIdentity, hydrateSlackMessageResult } from '../lib/mappers';
import { sendSlackBody } from '../lib/outgoing';

export let chatReplyMessage = contract
  .implement(spec)
  .scopes(slackActionScopes.chatWrite)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let threadTs =
      ctx.input.reply?.reference?.threadId ??
      ctx.input.reply?.reference?.id ??
      ctx.input.reply?.id;
    if (!threadTs) throw new Error('Slack replies require reply.id or reply.reference');
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
