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
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('Your Project Bubble API key from the My Account page')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: any) => {
      let axios = createAxios({
        baseURL: 'https://api.projectbubble.com/v2'
      });

      let response = await axios.get('/user', {
        headers: {
          key: ctx.output.token
        }
      });

      let user = response.data?.data?.[0] || response.data;

      return {
        profile: {
          id: String(user.user_id || ''),
          email: user.email || '',
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
          imageUrl: user.avatar || undefined
        }
      };
    }
  });
