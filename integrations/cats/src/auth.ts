import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let axios = createAxios({
  baseURL: 'https://api.catsone.com/v3'
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
        .describe('Your CATS API key. Create one from Administration settings in CATS.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let response = await axios.get('/site', {
        headers: {
          Authorization: `Token ${ctx.output.token}`
        }
      });
      return {
        profile: {
          id: response.data.subdomain,
          name: response.data.subdomain
        }
      };
    }
  });
