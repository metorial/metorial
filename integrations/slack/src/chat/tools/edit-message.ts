import { editMessage as contract } from '@slates/adapter-chat';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';
import { getSlackIdentity, hydrateSlackMessageResult } from '../lib/mappers';
import { renderChatBody } from '../lib/render';

export let chatEditMessage = contract
  .implement(spec)
  .scopes(slackActionScopes.chatWrite)
  .handleInvocation(async ctx => {
    let client = createSlackChatClient(ctx, { action: contract.key });
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
