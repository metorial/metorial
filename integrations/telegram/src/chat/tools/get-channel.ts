import { getChannel as contract } from '@slates/adapter-chat';
import { TelegramClient } from '../../lib/client';
import { spec } from '../../spec';
import { withTelegramChatErrors } from '../lib/errors';
import { mapTelegramChat, resolveTelegramBot } from '../lib/mappers';

export let chatGetChannel = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = contract.key;
    return withTelegramChatErrors({ action, channelId: ctx.input.channelId }, async () => {
      let client = new TelegramClient(ctx.auth.token);
      let bot = await resolveTelegramBot(client, ctx.auth);
      let chat = await client.getChat(ctx.input.channelId);

      // Member count is display metadata; a failure here must not fail the lookup.
      let memberCount: number | undefined;
      try {
        memberCount = await client.getChatMemberCount(ctx.input.channelId);
      } catch {
        memberCount = undefined;
      }

      let channel = mapTelegramChat(chat, bot.id, { memberCount });
      return {
        output: { channel, raw: chat },
        message: `Fetched Telegram chat **${channel.name ?? channel.id}**.`
      };
    });
  })
  .build();
