import { actionInvoked as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { slackEventsTriggerGroup } from '../../triggers/eventsTriggerGroup';
import {
  getEventId,
  getSlackIdentity,
  mapSlackAuthor,
  mapSlackChannel,
  mapSlackMessage,
  mapSlackThread
} from '../lib/mappers';

export let chatActionInvoked = contract
  .implement(spec, slackEventsTriggerGroup)
  .scopes(slackActionScopes.chatWrite)
  .matches(payload => (payload as { type?: unknown }).type === 'block_actions')
  .map(async ctx => {
    let payload = ctx.input as Record<string, any>;
    let channelId = payload.channel?.id ?? payload.container?.channel_id;
    let messageId = payload.message?.ts ?? payload.container?.message_ts;
    if (!channelId || !messageId)
      throw new Error('Slack action is missing channel or message');

    let client = new SlackClient(ctx.auth.token);

    let [identity, user, rawChannel] = await Promise.all([
      getSlackIdentity(client),
      client.getUserInfo(payload.user.id).catch(() => undefined),
      client.getConversationInfo(channelId).catch(() => undefined)
    ]);

    let message = payload.message
      ? await mapSlackMessage(client, channelId, payload.message, {
          identity,
          hydratePermalink: true
        })
      : undefined;

    let threadTs = payload.message?.thread_ts ?? payload.container?.thread_ts;
    let action = (payload.actions ?? [])[0] as any;
    let selected =
      action?.selected_option?.value ??
      action?.selected_options?.map((item: any) => item.value).join(',');

    let input = {
      actionId: action?.action_id ?? '',
      value: action?.value ?? selected,
      messageId,
      channelId,
      author: mapSlackAuthor(user, identity, { user: payload.user.id }),
      triggerId: payload.trigger_id,
      selectedValues:
        selected && action?.action_id ? { [action.action_id]: selected } : undefined,
      message,
      channel: rawChannel
        ? mapSlackChannel(rawChannel, identity.team_id ?? payload.team?.id)
        : undefined,
      thread: threadTs
        ? mapSlackThread(channelId, threadTs, payload.message, message?.permalink)
        : undefined,
      raw: payload
    };

    let id = getEventId(payload, `${channelId}:${messageId}:${input.actionId}`);

    return {
      type: 'chat.action.invoked',
      id,
      output: { type: 'chat.action.invoked' as const, id, ...input }
    };
  })
  .build();
