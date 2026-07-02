import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let axios = createAxios({
  baseURL: 'https://cloudapi.mailercloud.com/v1'
});

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
        .describe('Your Mailercloud API key. Found under Account > Integrations > API Keys.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let response = await axios.get('/client/plan', {
        headers: {
          Authorization: ctx.output.token
        }
      });

      return {
        profile: {
          name: response.data?.data?.name ?? undefined,
          email: response.data?.data?.email ?? undefined
        }
      };
    }
  });
