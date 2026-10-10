import { ChatErrors, openSingleDm as contract } from '@slates/adapter-chat';
import { BOT_FRAMEWORK_AUTH_METHOD_KEY } from '../../lib/botFramework';
import { spec } from '../../spec';
import { createTeamsBotClient } from '../lib/client';
import { buildTeamsChannel, teamsBotUserId } from '../lib/ids';

// Needs user and tenant ids, and the app installed for the user.
// https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages#create-the-conversation
export let chatOpenSingleDm = contract
  .implement(spec)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let client = createTeamsBotClient(ctx.auth, action, { userId: ctx.input.userId });
    let identity = client.identity;

    if (!identity.tenantId) {
      throw ChatErrors.inputInvalid({
        action,
        message:
          'Opening a Teams direct message requires the tenant ID. Add the Directory (tenant) ID to the Teams bot connection.'
      });
    }

    let response = await client.createConversation(
      {
        bot: { id: teamsBotUserId(identity.appId) },
        members: [{ id: ctx.input.userId }],
        channelData: { tenant: { id: identity.tenantId } },
        tenantId: identity.tenantId,
        isGroup: false
      },
      ctx.input.userId
    );

    if (!response?.id) {
      throw ChatErrors.providerError({
        action,
        message: 'Teams did not return a conversation id.'
      });
    }

    let channel = buildTeamsChannel({
      conversationId: response.id,
      appId: identity.appId,
      conversationType: 'personal',
      raw: response
    });
    return {
      output: { channel, raw: response },
      message: `Opened Teams direct message \`${response.id}\`.`
    };
  })
  .build();
