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
        .describe(
          'Your All-Images.ai API key. Create one at https://app.all-images.ai/en/api-keys'
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
      let client = createAxios({
        baseURL: 'https://api.all-images.ai/v1'
      });

      let response = await client.get('/api-keys/check', {
        headers: { 'api-key': ctx.output.token }
      });

      return {
        profile: {
          email: response.data.email,
          name: response.data.name
        }
      };
    }
  });
