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
        .describe('Your Abyssale API key. Found in Workspace Settings > API Key.')
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
        baseURL: 'https://api.abyssale.com',
        headers: {
          'x-api-key': ctx.output.token,
          'Content-Type': 'application/json'
        }
      });

      let response = await axios.get('/ready');

      return {
        profile: {
          name: response.data?.company_name || 'Abyssale Workspace'
        }
      };
    }
  });
