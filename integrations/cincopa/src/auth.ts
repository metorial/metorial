import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let axios = createAxios({
  baseURL: 'https://api.cincopa.com/v2'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .describe(
          'Cincopa API token. Create one from your Account Dashboard under the profile icon.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    },
    getProfile: async (ctx: any) => {
      let response = await axios.get('/ping.json', {
        params: { api_token: ctx.output.token }
      });
      return {
        profile: {
          id: response.data?.uid || undefined,
          name: response.data?.name || undefined,
          email: response.data?.email || undefined
        }
      };
    }
  });
