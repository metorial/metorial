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
        .describe('Your GTmetrix API key. Found in your GTmetrix Account Settings page.')
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
        baseURL: 'https://gtmetrix.com/api/2.0',
        auth: {
          username: ctx.output.token,
          password: ''
        }
      });

      let response = await client.get('/status');
      let attrs = response.data.data.attributes;

      return {
        profile: {
          id: response.data.data.id,
          name: `${attrs.account_type} Account`,
          email: undefined
        }
      };
    }
  });
