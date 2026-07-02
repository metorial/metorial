import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Breathe HR API key')
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
          'Your Breathe HR API key (production keys start with prod-, sandbox keys start with sandbox-)'
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
      let baseURL = ctx.input.token.startsWith('sandbox-')
        ? 'https://api.sandbox.breathehr.info/v1'
        : 'https://api.breathehr.com/v1';

      let axios = createAxios({ baseURL });

      let response = await axios.get('/account', {
        headers: {
          'X-API-KEY': ctx.output.token
        }
      });

      let account = response.data?.account;

      return {
        profile: {
          id: account?.uuid || account?.id?.toString(),
          name: account?.name
        }
      };
    }
  });
