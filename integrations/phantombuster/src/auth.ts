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
        .describe('PhantomBuster API key. Found in Workspace Settings > Technical > API keys.')
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
        baseURL: 'https://api.phantombuster.com/api/v2'
      });

      let response = await axios.get('/orgs/fetch', {
        headers: {
          'X-Phantombuster-Key-1': ctx.output.token
        }
      });

      return {
        profile: {
          id: response.data.id,
          name: response.data.name
        }
      };
    }
  });
