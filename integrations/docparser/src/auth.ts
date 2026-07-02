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
          'Your Docparser secret API key, found at https://app.docparser.com/myaccount/api'
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
      let client = createAxios({
        baseURL: 'https://api.docparser.com/v1',
        auth: {
          username: ctx.output.token,
          password: ''
        }
      });

      let response = await client.get('/ping');

      if (response.data?.msg === 'pong') {
        return {
          profile: {
            name: 'Docparser Account'
          }
        };
      }

      throw new Error('Invalid API key');
    }
  });
