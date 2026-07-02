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
          'Callingly API key. Generate one from Settings → API Keys in the Callingly dashboard.'
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
      let axios = createAxios({
        baseURL: 'https://api.callingly.com/v1'
      });

      let response = await axios.get('/clients', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          Accept: 'application/json'
        }
      });

      return {
        profile: {
          id: response.data?.[0]?.id?.toString(),
          name: response.data?.[0]?.name,
          email: response.data?.[0]?.email
        }
      };
    }
  });
