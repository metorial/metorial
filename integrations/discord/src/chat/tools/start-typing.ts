import { startTyping as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { runDiscordChatAction } from '../lib/context';

// The indicator lasts about 10 seconds or until the bot sends a message.
export let chatStartTyping = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let channelId = ctx.input.threadId ?? ctx.input.channelId;
    await runDiscordChatAction(
      ctx,
      { action: contract.key, notFound: 'chat.channel.not_found' },
      client => client.triggerTyping(channelId)
    );

    return {
      output: { ok: true, raw: { channelId } },
      message: `Started typing in Discord channel \`${channelId}\`.`
    };
  })
  .build();
