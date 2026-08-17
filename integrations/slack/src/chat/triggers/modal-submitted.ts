import { modalSubmitted as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { getEventId, getSlackIdentity, mapSlackAuthor } from '../lib/mappers';
import {
  decodeModalMetadata,
  handleSlackWebhook,
  parseSlackViewValues,
  slackWebhookHttp
} from '../lib/webhook';

export let chatModalSubmitted = contract
  .implement(spec)
  .scopes(slackActionScopes.chatWrite)
  .webhook({
    http: slackWebhookHttp,
    handleRequest: ctx =>
      handleSlackWebhook(ctx, async request => {
        if (request.kind !== 'interaction' || request.body.type !== 'view_submission') return;
        let payload = request.body;
        let client = new SlackClient(ctx.auth.token);
        let [identity, user] = await Promise.all([
          getSlackIdentity(client),
          client.getUserInfo(payload.user.id).catch(() => undefined)
        ]);
        let metadata = decodeModalMetadata(payload.view?.private_metadata);
        return {
          callbackId: payload.view?.callback_id ?? '',
          viewId: payload.view?.id ?? '',
          values: parseSlackViewValues(payload.view?.state),
          author: mapSlackAuthor(user, identity, { user: payload.user.id }),
          privateMetadata: metadata.privateMetadata,
          triggerId: payload.trigger_id,
          raw: payload
        };
      }),
    handleEvent: async ctx => {
      let id = getEventId(ctx.input.raw, `${ctx.input.viewId}:submitted`);
      return {
        type: 'chat.modal.submitted',
        id,
        output: { type: 'chat.modal.submitted' as const, id, ...ctx.input }
      };
    }
  })
  .build();
