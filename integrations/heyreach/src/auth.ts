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
        .describe('HeyReach API key. Found in Integrations > API in your HeyReach account.')
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
        baseURL: 'https://api.heyreach.io/api/public',
        headers: {
          'X-API-KEY': ctx.output.token
        }
      });

      let response = await http.get('/auth/CheckApiKey');

      return {
        profile: {
          id: 'heyreach-user',
          name: 'HeyReach Account',
          verified: response.data === true || response.data?.data === true
        }
      };
    }
  });
