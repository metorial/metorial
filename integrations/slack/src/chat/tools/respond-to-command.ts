import { respondToCommand as contract } from '@slates/adapter-chat';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';
import { renderChatBody } from '../lib/render';

export let chatRespondToCommand = contract
  .implement(spec)
  .scopes(slackActionScopes.chatWrite)
  .handleInvocation(async ctx => {
    let client = createSlackChatClient(ctx, {
      action: contract.key,
      // A dead response_url is an expired interaction window, not a bad request.
      ambiguous: {
        expired_url: 'chat.interaction.response_expired',
        invalid_response_url: 'chat.interaction.response_expired',
        not_found: 'chat.command.not_found'
      }
    });
    let rendered = renderChatBody(ctx.input);
    let raw = await client.respondToUrl(ctx.input.responseToken, {
      text: rendered.text,
      blocks: rendered.blocks,
      responseType: ctx.input.ephemeral === false ? 'in_channel' : 'ephemeral',
      threadTs: ctx.input.threadId
    });
    return {
      output: { raw },
      message: 'Responded to the Slack command.'
    };
  })
  .build();
