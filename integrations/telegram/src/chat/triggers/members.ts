import { memberJoined, memberLeft } from '@slates/adapter-chat';
import { spec } from '../../spec';
import type { TelegramEvent } from '../../triggers/event-schemas';
import { telegramUpdatesTriggerGroup } from '../../triggers/updates-trigger-group';
import { eventId, readEventMember } from '../lib/events';
import { mapTelegramChat, mapTelegramUser } from '../lib/mappers';

let isMembership = (payload: unknown, membership: 'joined' | 'left') => {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return false;
  let event = payload as { kind?: unknown; membership?: unknown };
  return (
    (event.kind === 'chat_member' || event.kind === 'my_chat_member') &&
    event.membership === membership
  );
};

let mapMember = (event: TelegramEvent, action: string) => {
  let update = readEventMember(event, action);
  let channel = mapTelegramChat(update.chat, event.bot.id);
  return {
    id: eventId(event, `member:${event.membership}`),
    fields: {
      channelId: channel.id,
      author: mapTelegramUser(update.new_chat_member.user, event.bot.id),
      channel,
      raw: event.update
    }
  };
};

export let chatMemberJoined = memberJoined
  .implement(spec, telegramUpdatesTriggerGroup)
  .matches(payload => isMembership(payload, 'joined'))
  .map(async ctx => {
    let { id, fields } = mapMember(ctx.input, memberJoined.key);
    return {
      type: 'chat.member.joined',
      id,
      output: { type: 'chat.member.joined' as const, id, ...fields }
    };
  })
  .build();

export let chatMemberLeft = memberLeft
  .implement(spec, telegramUpdatesTriggerGroup)
  .matches(payload => isMembership(payload, 'left'))
  .map(async ctx => {
    let { id, fields } = mapMember(ctx.input, memberLeft.key);
    return {
      type: 'chat.member.left',
      id,
      output: { type: 'chat.member.left' as const, id, ...fields }
    };
  })
  .build();
