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
        .describe('Your SignWell API key. Found in Settings -> API in your SignWell account.')
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
        baseURL: 'https://www.signwell.com/api/v1'
      });

      let response = await axios.get('/me', {
        headers: {
          'X-Api-Key': ctx.output.token
        }
      });

      return {
        profile: {
          id: response.data.id,
          email: response.data.email,
          name: response.data.name
        }
      };
    }
  });
