import { ChatErrors, openModal as contract } from '@slates/adapter-chat';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';
import { renderModal } from '../lib/render';

export let chatOpenModal = contract
  .implement(spec)
  .scopes(slackActionScopes.chatWrite)
  .handleInvocation(async ctx => {
    let client = createSlackChatClient(ctx, {
      action: contract.key,
      // On views.* endpoints these generic codes are about the modal, not a channel.
      ambiguous: {
        not_found: 'chat.interaction.modal_not_found',
        invalid_arguments: 'chat.interaction.modal_invalid',
        view_too_large: 'chat.interaction.modal_invalid'
      }
    });
    let result = await client.openView({
      triggerId: ctx.input.triggerId,
      view: renderModal(ctx.input.modal, ctx.input.contextId)
    });
    let viewId = result.view.id;
    if (typeof viewId !== 'string')
      throw ChatErrors.modalInvalid({
        action: contract.key,
        message: 'Slack accepted the modal but did not return a view id',
        slate: { code: 'upstream.invalid_response' }
      });
    return {
      output: { viewId, raw: result.view },
      message: `Opened Slack modal \`${viewId}\`.`
    };
  })
  .build();
