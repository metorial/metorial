import { deleteMessage as contract } from '@slates/adapter-chat';
import { BOT_FRAMEWORK_AUTH_METHOD_KEY } from '../../lib/botFramework';
import { spec } from '../../spec';
import { createTeamsBotClient } from '../lib/client';

// Bots can delete only their own messages.
// https://learn.microsoft.com/en-us/microsoftteams/platform/bots/build-conversational-capability#delete-messages
export let chatDeleteMessage = contract
  .implement(spec)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .handleInvocation(async ctx => {
    let client = createTeamsBotClient(ctx.auth, contract.key, {
      channelId: ctx.input.channelId,
      messageId: ctx.input.messageId
    });
    await client.deleteActivity(ctx.input.channelId, ctx.input.messageId);
    return {
      output: {
        ok: true,
        raw: { conversationId: ctx.input.channelId, activityId: ctx.input.messageId }
      },
      message: `Deleted Teams message \`${ctx.input.messageId}\`.`
    };
  })
  .build();
