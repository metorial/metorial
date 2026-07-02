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
          'Your Refiner API key. Found in the Refiner dashboard under Integrations > REST API.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: any) => {
      let axios = createAxios({
        baseURL: 'https://api.refiner.io/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/account');
      let account = response.data;

      return {
        profile: {
          name: account.subscription?.plan ?? 'Refiner Account'
        }
      };
    }
  });
