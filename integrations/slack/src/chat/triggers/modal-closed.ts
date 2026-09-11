import { modalClosed as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { slackEventsTriggerGroup } from '../../triggers/eventsTriggerGroup';
import { getEventId, getSlackIdentity, mapSlackAuthor } from '../lib/mappers';

export let chatModalClosed = contract
  .implement(spec, slackEventsTriggerGroup)
  .scopes(slackActionScopes.chatWrite)
  .matches(payload => (payload as { type?: unknown }).type === 'view_closed')
  .map(async ctx => {
    let payload = ctx.input as Record<string, any>;
    let client = new SlackClient(ctx.auth.token);

    let [identity, user] = await Promise.all([
      getSlackIdentity(client),
      client.getUserInfo(payload.user.id).catch(() => undefined)
    ]);

    let input = {
      callbackId: payload.view?.callback_id ?? '',
      viewId: payload.view?.id,
      author: mapSlackAuthor(user, identity, { user: payload.user.id }),
      raw: payload
    };

    let id = getEventId(payload, `${input.viewId ?? input.callbackId}:closed`);

    return {
      type: 'chat.modal.closed',
      id,
      output: { type: 'chat.modal.closed' as const, id, ...input }
    };
  })
  .build();
