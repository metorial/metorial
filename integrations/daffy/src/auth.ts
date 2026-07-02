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
        .describe('Daffy API key. Obtain from https://www.daffy.org/settings/api')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = createAxios({
        baseURL: 'https://public.daffy.org/v1',
        headers: {
          'X-Api-Key': ctx.output.token
        }
      });

      let response = await client.get('/users/me');
      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          name: user.name,
          imageUrl: user.avatar
        }
      };
    }
  });
