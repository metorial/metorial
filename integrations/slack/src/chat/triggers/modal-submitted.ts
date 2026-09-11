import { modalSubmitted as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { slackEventsTriggerGroup } from '../../triggers/eventsTriggerGroup';
import { getEventId, getSlackIdentity, mapSlackAuthor } from '../lib/mappers';
import { decodeModalMetadata, parseSlackViewValues } from '../lib/webhook';

export let chatModalSubmitted = contract
  .implement(spec, slackEventsTriggerGroup)
  .scopes(slackActionScopes.chatWrite)
  .matches(payload => (payload as { type?: unknown }).type === 'view_submission')
  .map(async ctx => {
    let payload = ctx.input as Record<string, any>;
    let client = new SlackClient(ctx.auth.token);

    let [identity, user] = await Promise.all([
      getSlackIdentity(client),
      client.getUserInfo(payload.user.id).catch(() => undefined)
    ]);

    let metadata = decodeModalMetadata(payload.view?.private_metadata);

    let input = {
      callbackId: payload.view?.callback_id ?? '',
      viewId: payload.view?.id ?? '',
      values: parseSlackViewValues(payload.view?.state),
      author: mapSlackAuthor(user, identity, { user: payload.user.id }),
      privateMetadata: metadata.privateMetadata,
      triggerId: payload.trigger_id,
      raw: payload
    };

    let id = getEventId(payload, `${input.viewId}:submitted`);

    return {
      type: 'chat.modal.submitted',
      id,
      output: { type: 'chat.modal.submitted' as const, id, ...input }
    };
  })
  .build();
