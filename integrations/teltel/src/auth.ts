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
      apiKey: z.string().describe('TelTel API key found under Settings in your TelTel account')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let client = createAxios({
        baseURL: 'https://api.teltel.io/v2',
        headers: {
          'X-API-KEY': ctx.output.token
        }
      });

      let response = await client.get('/users');
      let users = response.data;

      let firstUser = Array.isArray(users) && users.length > 0 ? users[0] : null;

      return {
        profile: {
          id: firstUser?.id?.toString(),
          name: firstUser?.name
        }
      };
    }
  });
