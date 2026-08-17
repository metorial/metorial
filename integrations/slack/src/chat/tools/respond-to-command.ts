import { respondToCommand as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { renderChatBody } from '../lib/render';

export let chatRespondToCommand = contract
  .implement(spec)
  .scopes(slackActionScopes.chatWrite)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
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
