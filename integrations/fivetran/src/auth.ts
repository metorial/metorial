import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Base64-encoded API key:secret for Basic auth')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & Secret',
    key: 'api_key_secret',

    inputSchema: z.object({
      apiKey: z.string().describe('Fivetran API key (Scoped or System key)'),
      apiSecret: z.string().describe('Fivetran API secret')
    }),

    getOutput: async ctx => {
      let encoded = btoa(`${ctx.input.apiKey}:${ctx.input.apiSecret}`);
      return {
        output: {
          token: encoded
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://api.fivetran.com/v1',
        headers: {
          Authorization: `Basic ${ctx.output.token}`
        }
      });

      let response = await http.get('/users/me');
      let user = response.data?.data;

      return {
        profile: {
          id: user?.id,
          email: user?.email,
          name: [user?.given_name, user?.family_name].filter(Boolean).join(' ') || undefined,
          imageUrl: user?.picture
        }
      };
    }
  });
