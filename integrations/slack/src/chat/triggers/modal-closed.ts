import { modalClosed as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { getEventId, getSlackIdentity, mapSlackAuthor } from '../lib/mappers';
import { handleSlackWebhook, slackWebhookHttp } from '../lib/webhook';

export let chatModalClosed = contract
  .implement(spec)
  .scopes(slackActionScopes.chatWrite)
  .webhook({
    http: slackWebhookHttp,
    handleRequest: ctx =>
      handleSlackWebhook(ctx, async request => {
        if (request.kind !== 'interaction' || request.body.type !== 'view_closed') return;
        let payload = request.body;
        let client = new SlackClient(ctx.auth.token);
        let [identity, user] = await Promise.all([
          getSlackIdentity(client),
          client.getUserInfo(payload.user.id).catch(() => undefined)
        ]);
        return {
          callbackId: payload.view?.callback_id ?? '',
          viewId: payload.view?.id,
          author: mapSlackAuthor(user, identity, { user: payload.user.id }),
          raw: payload
        };
      }),
    handleEvent: async ctx => {
      let id = getEventId(ctx.input.raw, `${ctx.input.viewId ?? ctx.input.callbackId}:closed`);
      return {
        type: 'chat.modal.closed',
        id,
        output: { type: 'chat.modal.closed' as const, id, ...ctx.input }
      };
    }
  })
  .build();
