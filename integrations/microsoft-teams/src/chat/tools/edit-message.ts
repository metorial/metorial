import { editMessage as contract } from '@slates/adapter-chat';
import { BOT_FRAMEWORK_AUTH_METHOD_KEY } from '../../lib/botFramework';
import { spec } from '../../spec';
import { createTeamsBotClient } from '../lib/client';
import { buildTeamsChannel } from '../lib/ids';
import { mapSentMessage } from '../lib/mappers';
import { renderTeamsMarkdown } from '../lib/render';

// Update activity (bots can edit only their own messages):
// https://learn.microsoft.com/en-us/microsoftteams/platform/bots/build-conversational-capability#update-messages
export let chatEditMessage = contract
  .implement(spec)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let client = createTeamsBotClient(ctx.auth, action, {
      channelId: ctx.input.channelId,
      messageId: ctx.input.messageId
    });
    let text = renderTeamsMarkdown(ctx.input, action);
    let response = await client.updateActivity(ctx.input.channelId, ctx.input.messageId, {
      type: 'message',
      text,
      textFormat: 'markdown'
    });

    let identity = client.identity;
    let channel = buildTeamsChannel({
      conversationId: ctx.input.channelId,
      appId: identity.appId
    });
    // Teams does not return the edited message; the timestamps record when
    // this edit was accepted.
    let message = mapSentMessage({
      id: ctx.input.messageId,
      channelId: channel.id,
      body: ctx.input,
      appId: identity.appId,
      botName: identity.botName,
      sentAt: new Date().toISOString(),
      edited: true,
      raw: response ?? null
    });

    return {
      output: { message, channel, raw: response ?? null },
      message: `Edited Teams message \`${ctx.input.messageId}\`.`
    };
  })
  .build();
