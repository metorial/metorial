import { getAuthenticatedUser as contract } from '@slates/adapter-chat';
import { ZOOM_CHATBOT_AUTH_METHOD } from '../../lib/authMethods';
import { spec } from '../../spec';
import { ZoomChatbotClient } from '../lib/client';
import { mapZoomBotAuthor, mapZoomWorkspace } from '../lib/mappers';

export let chatGetAuthenticatedUser = contract
  .implement(spec)
  .authMethods([ZOOM_CHATBOT_AUTH_METHOD])
  .handleInvocation(async ctx => {
    let client = new ZoomChatbotClient(ctx.auth, contract.key);
    return {
      output: {
        author: mapZoomBotAuthor(client.botJid),
        workspace: mapZoomWorkspace(client.accountId),
        raw: { robotJid: client.botJid, accountId: client.accountId }
      },
      message: `Connected as Zoom chatbot \`${client.botJid}\` in account \`${client.accountId}\`.`
    };
  })
  .build();
