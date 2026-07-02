import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('RedCircle API key')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your RedCircle API key. Sign up at https://app.redcircleapi.com/signup to obtain one.'
        )
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
        baseURL: 'https://api.redcircleapi.com'
      });

      let response = await axios.get('/account', {
        params: {
          api_key: ctx.output.token
        }
      });

      let account = response.data?.account_info;

      return {
        profile: {
          id: account?.api_key,
          email: account?.email,
          name: account?.name
        }
      };
    }
  });
