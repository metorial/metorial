import { parseEmoji } from '@slates/adapter-chat';
import type { SlackClient } from '../../lib/client';
import type { SlackMessage } from '../../lib/types';
import {
  getSlackIdentity,
  mapSlackAuthor,
  mapSlackChannel,
  mapSlackMessage,
  mapSlackThread
} from './mappers';

export let mapMessageEvent = async (
  client: SlackClient,
  envelope: Record<string, any>,
  rawMessage: Record<string, any>,
  mention = false
) => {
  let channelId = rawMessage.channel;
  let [identity, rawChannel] = await Promise.all([
    getSlackIdentity(client),
    channelId ? client.getConversationInfo(channelId).catch(() => undefined) : undefined
  ]);
  let slackMessage = rawMessage as SlackMessage;
  let message = await mapSlackMessage(client, channelId, slackMessage, {
    identity,
    hydratePermalink: true
  });
  message.isMention = mention;
  let threadTs =
    slackMessage.thread_ts ??
    (slackMessage.reply_count !== undefined ? slackMessage.ts : undefined);
  return {
    ...message,
    channelId,
    channel: rawChannel
      ? mapSlackChannel(rawChannel, identity.team_id ?? envelope.team_id)
      : undefined,
    thread: threadTs
      ? mapSlackThread(channelId, threadTs, slackMessage, message.permalink)
      : undefined,
    raw: envelope
  };
};

export let mapReactionEvent = async (
  client: SlackClient,
  envelope: Record<string, any>,
  event: Record<string, any>
) => {
  let channelId = event.item?.channel;
  let messageId = event.item?.ts;
  let [identity, user, rawChannel, rawMessage] = await Promise.all([
    getSlackIdentity(client),
    event.user ? client.getUserInfo(event.user).catch(() => undefined) : undefined,
    channelId ? client.getConversationInfo(channelId).catch(() => undefined) : undefined,
    channelId && messageId
      ? client
          .getConversationHistory({
            channel: channelId,
            oldest: messageId,
            latest: messageId,
            inclusive: true,
            limit: 1
          })
          .then(result => result.messages.find(message => message.ts === messageId))
          .catch(() => undefined)
      : undefined
  ]);
  let message = rawMessage
    ? await mapSlackMessage(client, channelId, rawMessage, {
        identity,
        hydratePermalink: true
      })
    : undefined;
  let threadTs = rawMessage?.thread_ts;
  return {
    messageId,
    channelId,
    emoji: parseEmoji(`:${event.reaction}:`),
    author: mapSlackAuthor(user, identity, { user: event.user }),
    message,
    channel: rawChannel
      ? mapSlackChannel(rawChannel, identity.team_id ?? envelope.team_id)
      : undefined,
    thread: threadTs
      ? mapSlackThread(channelId, threadTs, rawMessage, message?.permalink)
      : undefined,
    raw: envelope
  };
};

export let hydrateMemberEvent = async (
  client: SlackClient,
  envelope: Record<string, any>,
  event: Record<string, any>
) => {
  let [identity, user, rawChannel] = await Promise.all([
    getSlackIdentity(client),
    client.getUserInfo(event.user).catch(() => undefined),
    client.getConversationInfo(event.channel).catch(() => undefined)
  ]);
  return {
    channelId: event.channel,
    author: mapSlackAuthor(user, identity, { user: event.user }),
    channel: rawChannel
      ? mapSlackChannel(rawChannel, identity.team_id ?? envelope.team_id)
      : undefined,
    raw: envelope
  };
};
