import { SlateAuth } from 'slates';
import { z } from 'zod';
import { TelegramClient } from './lib/client';

let getBot = async (token: string) =>
  (await new TelegramClient(token).getMe()) as {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      botId: z
        .string()
        .optional()
        .describe('Bot user ID. Absent for connections created before it was recorded.'),
      botUsername: z.string().optional().describe('Bot username without the leading @'),
      botName: z.string().optional().describe('Bot display name')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bot Token',
    key: 'bot_token',
    adapters: ['chat'],

    inputSchema: z.object({
      token: z.string().describe('Telegram Bot token obtained from @BotFather')
    }),

    getOutput: async ctx => {
      let bot = await getBot(ctx.input.token);
      return {
        output: {
          token: ctx.input.token,
          botId: String(bot.id),
          botUsername: bot.username,
          botName: [bot.first_name, bot.last_name].filter(Boolean).join(' ')
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let bot = await getBot(ctx.output.token);

      return {
        profile: {
          id: String(bot.id),
          name: [bot.first_name, bot.last_name].filter(Boolean).join(' '),
          username: bot.username
        }
      };
    }
  });
