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
        .describe('Your Promptmate.io API key. You can find it in your account settings.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let http = createAxios({
        baseURL: 'https://api.promptmate.io/v1',
        headers: {
          'x-api-key': ctx.output.token
        }
      });

      let response = await http.get('/userInfo');
      let user = response.data;

      return {
        profile: {
          id: user.userId,
          name: user.userName || user.name,
          email: user.email
        }
      };
    }
  });
