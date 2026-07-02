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
        .describe('Your Zylvie API key, found under Settings > API in your Zylvie dashboard')
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
        baseURL: 'https://api.zylvie.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await client.get('/me');

      return {
        profile: {
          email: response.data.email,
          name: response.data.brand
        }
      };
    }
  });
