import { optionsLoad as contract } from '@slates/adapter-chat';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { getEventId } from '../lib/mappers';
import { handleSlackWebhook, slackWebhookHttp } from '../lib/webhook';

export let chatOptionsLoad = contract
  .implement(spec)
  .scopes(slackActionScopes.chatWrite)
  .webhook({
    http: slackWebhookHttp,
    handleRequest: ctx =>
      handleSlackWebhook(ctx, async request => {
        if (request.kind !== 'interaction' || request.body.type !== 'block_suggestion') return;
        let payload = request.body;
        let action = payload.action ?? payload.actions?.[0] ?? {};
        return {
          actionId: action.action_id ?? '',
          query: action.value ?? payload.value ?? '',
          minQueryLength: action.min_query_length,
          raw: payload
        };
      }),
    handleEvent: async ctx => {
      let id = getEventId(ctx.input.raw, `${ctx.input.actionId}:${ctx.input.query}`);
      return {
        type: 'chat.options.load',
        id,
        output: { type: 'chat.options.load' as const, id, ...ctx.input }
      };
    }
  })
  .build();
