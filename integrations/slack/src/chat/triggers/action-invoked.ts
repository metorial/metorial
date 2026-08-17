import { actionInvoked as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import {
  getEventId,
  getSlackIdentity,
  mapSlackAuthor,
  mapSlackChannel,
  mapSlackMessage,
  mapSlackThread
} from '../lib/mappers';
import { handleSlackWebhook, slackWebhookHttp } from '../lib/webhook';

export let chatActionInvoked = contract
  .implement(spec)
  .scopes(slackActionScopes.chatWrite)
  .webhook({
    http: slackWebhookHttp,
    handleRequest: ctx =>
      handleSlackWebhook(ctx, async request => {
        if (request.kind !== 'interaction' || request.body.type !== 'block_actions') return;
        let payload = request.body;
        let channelId = payload.channel?.id ?? payload.container?.channel_id;
        let messageId = payload.message?.ts ?? payload.container?.message_ts;
        if (!channelId || !messageId) return;
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
        return (payload.actions ?? []).map((action: any) => {
          let selected =
            action.selected_option?.value ??
            action.selected_options?.map((item: any) => item.value).join(',');
          return {
            actionId: action.action_id,
            value: action.value ?? selected,
            messageId,
            channelId,
            author: mapSlackAuthor(user, identity, { user: payload.user.id }),
            triggerId: payload.trigger_id,
            selectedValues: selected ? { [action.action_id]: selected } : undefined,
            message,
            channel: rawChannel
              ? mapSlackChannel(rawChannel, identity.team_id ?? payload.team?.id)
              : undefined,
            thread: threadTs
              ? mapSlackThread(channelId, threadTs, payload.message, message?.permalink)
              : undefined,
            raw: payload
          };
        });
      }),
    handleEvent: async ctx => {
      let id = getEventId(
        ctx.input.raw,
        `${ctx.input.channelId}:${ctx.input.messageId}:${ctx.input.actionId}`
      );
      return {
        type: 'chat.action.invoked',
        id,
        output: { type: 'chat.action.invoked' as const, id, ...ctx.input }
      };
    }
  })
  .build();
