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
        .describe('Your Proofly API key, found on the Proofly developers page.')
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
        baseURL: 'https://proofly.io/api',
        headers: {
          'X-Api-Key': ctx.output.token
        }
      });

      let response = await axios.get('/user');
      let user = response.data;

      return {
        profile: {
          name: user.name,
          email: user.email
        }
      };
    }
  });
