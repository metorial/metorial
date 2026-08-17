import { openModal as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { renderModal } from '../lib/render';

export let chatOpenModal = contract
  .implement(spec)
  .scopes(slackActionScopes.chatWrite)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let result = await client.openView({
      triggerId: ctx.input.triggerId,
      view: renderModal(ctx.input.modal, ctx.input.contextId)
    });
    let viewId = result.view.id;
    if (typeof viewId !== 'string') throw new Error('Slack did not return a view id');
    return {
      output: { viewId, raw: result.view },
      message: `Opened Slack modal \`${viewId}\`.`
    };
  })
  .build();
