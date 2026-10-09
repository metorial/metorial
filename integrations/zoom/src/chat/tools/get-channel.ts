import { ChatErrors, getChannel as contract } from '@slates/adapter-chat';
import { ZOOM_CHATBOT_AUTH_METHOD } from '../../lib/authMethods';
import { spec } from '../../spec';
import { ZoomChatbotClient } from '../lib/client';
import { getZoomJidKind, mapZoomChannel } from '../lib/mappers';

/**
 * Documented fallback: the chatbot API has no channel lookup, so the channel is
 * described from its JID (`...@conference.xmpp.zoom.us` = channel, otherwise a
 * user JID for a direct chat). No name is invented.
 */
export let chatGetChannel = contract
  .implement(spec)
  .authMethods([ZOOM_CHATBOT_AUTH_METHOD])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let client = new ZoomChatbotClient(ctx.auth, action);
    let channelId = ctx.input.channelId.trim();
    if (getZoomJidKind(channelId) === 'unknown') {
      throw ChatErrors.inputInvalid({
        action,
        message:
          'Zoom chatbot channels are addressed by JID, for example CHANNEL_ID@conference.xmpp.zoom.us or USER_ID@xmpp.zoom.us.',
        issues: [{ path: ['channelId'], code: 'invalid', message: 'Expected a Zoom JID' }]
      });
    }
    let channel = mapZoomChannel(channelId, client.accountId);
    return {
      output: { channel, raw: { jid: channelId } },
      message: `Described Zoom ${channel.type === 'dm' ? 'direct chat' : 'channel'} \`${channelId}\`.`
    };
  })
  .build();
