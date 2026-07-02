import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bot Token',
    key: 'bot_token',

    inputSchema: z.object({
      token: z.string().describe('Telegram Bot token obtained from @BotFather')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let axios = createAxios({
        baseURL: `https://api.telegram.org/bot${ctx.output.token}`
      });

      let response = await axios.get('/getMe');
      let bot = response.data.result;

      return {
        profile: {
          id: String(bot.id),
          name: [bot.first_name, bot.last_name].filter(Boolean).join(' '),
          username: bot.username
        }
      };
    }
  });
