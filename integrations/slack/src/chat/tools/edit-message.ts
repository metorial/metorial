import { editMessage as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { getSlackIdentity, hydrateSlackMessageResult } from '../lib/mappers';
import { renderChatBody } from '../lib/render';

export let chatEditMessage = contract
  .implement(spec)
  .scopes(slackActionScopes.chatWrite)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let rendered = renderChatBody(ctx.input);
    let message = await client.updateMessage({
      channel: ctx.input.channelId,
      ts: ctx.input.messageId,
      text: rendered.text,
      blocks: rendered.blocks
    });
    return {
      output: await hydrateSlackMessageResult(client, ctx.input.channelId, message, {
        identity: await getSlackIdentity(client)
      }),
      message: `Updated Slack message \`${ctx.input.messageId}\`.`
    };
  })
  .build();
