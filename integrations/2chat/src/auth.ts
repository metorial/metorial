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
      token: z
        .string()
        .describe(
          'Your 2Chat API key. Generate one at https://app.2chat.io/developers?tab=api-access'
        )
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
        baseURL: 'https://api.p.2chat.io/open',
        headers: {
          'X-User-API-Key': ctx.output.token
        }
      });

      let response = await axios.get('/info');
      let data = response.data;

      return {
        profile: {
          id: data.id || data.uuid,
          email: data.email,
          name: data.name || data.account_name
        }
      };
    }
  });
