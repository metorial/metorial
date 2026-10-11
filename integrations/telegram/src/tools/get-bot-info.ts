import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

// https://core.telegram.org/bots/api#getme
export let getBotInfoTool = SlateTool.create(spec, {
  name: 'Get Bot Info',
  key: 'get_bot_info',
  description: `Get the connected Telegram bot's identity and settings: its user ID, name, username, and whether it can join groups, read all group messages, and answer inline queries.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      botId: z.string().describe('User ID of the bot'),
      firstName: z.string().describe('Bot display name'),
      lastName: z.string().optional().describe('Bot last name, if set'),
      username: z.string().optional().describe('Bot username without the leading @'),
      link: z.string().optional().describe('Public t.me link to the bot'),
      canJoinGroups: z.boolean().optional().describe('Whether the bot can be added to groups'),
      canReadAllGroupMessages: z
        .boolean()
        .optional()
        .describe('Whether privacy mode is disabled, so the bot receives all group messages'),
      supportsInlineQueries: z
        .boolean()
        .optional()
        .describe('Whether inline mode is enabled for the bot')
    })
  )
  .handleInvocation(async ctx => {
    let me = await new TelegramClient(ctx.auth.token).getMe();

    return {
      output: {
        botId: String(me.id),
        firstName: me.first_name,
        lastName: me.last_name,
        username: me.username,
        link: me.username ? `https://t.me/${me.username}` : undefined,
        canJoinGroups: me.can_join_groups,
        canReadAllGroupMessages: me.can_read_all_group_messages,
        supportsInlineQueries: me.supports_inline_queries
      },
      message: `Connected as Telegram bot **${me.username ? `@${me.username}` : me.first_name}** (ID ${me.id}).`
    };
  })
  .build();
