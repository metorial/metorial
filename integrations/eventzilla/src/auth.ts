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
      token: z.string().describe('Eventzilla API key from Settings > App Management')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://www.eventzillaapi.net/api/v2',
        headers: {
          'x-api-key': ctx.output.token
        }
      });

      let response = await http.get('/users/');
      let users = response.data?.users ?? response.data;
      let user = Array.isArray(users) ? users[0] : users;

      return {
        profile: {
          id: user?.id?.toString(),
          email: user?.email,
          name: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || undefined,
          imageUrl: user?.avatar_url
        }
      };
    }
  });
