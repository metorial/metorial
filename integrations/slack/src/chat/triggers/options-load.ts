import { optionsLoad as contract } from '@slates/adapter-chat';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { slackEventsTriggerGroup } from '../../triggers/eventsTriggerGroup';
import { getEventId } from '../lib/mappers';

export let chatOptionsLoad = contract
  .implement(spec, slackEventsTriggerGroup)
  .scopes(slackActionScopes.chatWrite)
  .matches(payload => (payload as { type?: unknown }).type === 'block_suggestion')
  .map(async ctx => {
    let payload = ctx.input as Record<string, any>;
    let action = payload.action ?? payload.actions?.[0] ?? {};

    let input = {
      actionId: action.action_id ?? '',
      query: action.value ?? payload.value ?? '',
      minQueryLength: action.min_query_length,
      raw: payload
    };

    let id = getEventId(payload, `${input.actionId}:${input.query}`);

    return {
      type: 'chat.options.load',
      id,
      output: { type: 'chat.options.load' as const, id, ...input }
    };
  })
  .build();
