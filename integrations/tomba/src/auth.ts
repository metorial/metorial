import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      apiKey: z.string(),
      apiSecret: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key & Secret',
    key: 'api_key_secret',

    inputSchema: z.object({
      apiKey: z.string().describe('Your Tomba API key (starts with ta_)'),
      apiSecret: z.string().describe('Your Tomba API secret (starts with ts_)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          apiKey: ctx.input.apiKey,
          apiSecret: ctx.input.apiSecret
        }
      };
    },

    getProfile: async (ctx: {
      output: { apiKey: string; apiSecret: string };
      input: { apiKey: string; apiSecret: string };
    }) => {
      let http = createAxios({
        baseURL: 'https://api.tomba.io/v1'
      });

      let response = await http.get('/me', {
        headers: {
          'X-Tomba-Key': ctx.output.apiKey,
          'X-Tomba-Secret': ctx.output.apiSecret
        }
      });

      let data = response.data?.data;

      return {
        profile: {
          id: data?.user_id?.toString(),
          email: data?.email,
          name: [data?.first_name, data?.last_name].filter(Boolean).join(' ') || undefined,
          imageUrl: data?.image || undefined
        }
      };
    }
  });
