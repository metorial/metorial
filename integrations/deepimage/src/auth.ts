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
          'Your Deep Image API key. Find it at https://deep-image.ai/app/my-profile/api'
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
        baseURL: 'https://deep-image.ai/rest_api'
      });

      let response = await axios.get('/me', {
        headers: {
          'X-API-KEY': ctx.output.token
        }
      });

      return {
        profile: {
          email: response.data.email,
          name: response.data.username
        }
      };
    }
  });
