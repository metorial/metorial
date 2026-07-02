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
      apiKey: z
        .string()
        .describe('Your LMNT API key. Get it from your account page at app.lmnt.com.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let axios = createAxios({
        baseURL: 'https://api.lmnt.com',
        headers: {
          'X-API-Key': ctx.output.token
        }
      });

      let response = await axios.get('/v1/account');
      let account = response.data;

      return {
        profile: {
          name: account.plan?.type ?? 'LMNT User'
        }
      };
    }
  });
