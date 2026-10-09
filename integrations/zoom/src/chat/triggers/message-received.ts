import { messageReceived as contract } from '@slates/adapter-chat';
import { ZOOM_CHATBOT_AUTH_METHOD } from '../../lib/authMethods';
import { spec } from '../../spec';
import { zoomChatbotTriggerGroup } from '../../triggers/chatbotTriggerGroup';
import {
  isZoomBotNotification,
  isZoomSlashCommandNotification,
  mapZoomBotNotification
} from '../lib/events';

/**
 * A `bot_notification` from a direct chat with the bot becomes a message; channel
 * notifications are slash commands and become command.invoked instead.
 * https://developers.zoom.us/docs/api/chatbot/events/#tag/bot_notification
 */
export let chatMessageReceived = contract
  .implement(spec, zoomChatbotTriggerGroup)
  .authMethods([ZOOM_CHATBOT_AUTH_METHOD])
  .matches(
    payload => isZoomBotNotification(payload) && !isZoomSlashCommandNotification(payload)
  )
  .map(async ctx => {
    let { key, message, channel } = mapZoomBotNotification(ctx.input);
    let id = `zoom:${key}:message`;
    return {
      type: 'chat.message.received',
      id,
      output: {
        type: 'chat.message.received' as const,
        id,
        message,
        channel,
        raw: ctx.input
      }
    };
  })
  .build();
