import { commandInvoked as contract } from '@slates/adapter-chat';
import { ZOOM_CHATBOT_AUTH_METHOD } from '../../lib/authMethods';
import { spec } from '../../spec';
import { zoomChatbotTriggerGroup } from '../../triggers/chatbotTriggerGroup';
import { isZoomSlashCommandNotification, mapZoomBotNotification } from '../lib/events';

// A chatbot has one slash command (saved with the registration); `cmd` is the text after it.
export let chatCommandInvoked = contract
  .implement(spec, zoomChatbotTriggerGroup)
  .authMethods([ZOOM_CHATBOT_AUTH_METHOD])
  .matches(
    payload =>
      isZoomSlashCommandNotification(payload) &&
      typeof (payload as { commandName?: unknown }).commandName === 'string' &&
      (payload as { commandName: string }).commandName.length > 0
  )
  .map(async ctx => {
    let { key, message, channel } = mapZoomBotNotification(ctx.input);
    let triggerId =
      typeof ctx.input.payload.triggerId === 'string' && ctx.input.payload.triggerId
        ? ctx.input.payload.triggerId
        : undefined;
    let text = typeof ctx.input.payload.cmd === 'string' ? ctx.input.payload.cmd : '';
    let id = `zoom:${key}:command`;

    return {
      type: 'chat.command.invoked',
      id,
      output: {
        type: 'chat.command.invoked' as const,
        id,
        name: ctx.input.commandName ?? '',
        text: text || undefined,
        author: message.author,
        channelId: message.channelId,
        triggerId,
        message,
        channel,
        raw: ctx.input
      }
    };
  })
  .build();
