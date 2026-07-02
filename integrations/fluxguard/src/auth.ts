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
      token: z.string().describe('Fluxguard API key. Create one in your org settings.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://api.fluxguard.com',
        headers: {
          'x-api-key': ctx.output.token
        }
      });

      let response = await http.get('/account');
      let account = response.data;

      return {
        profile: {
          id: account.orgId ?? account.id ?? undefined,
          name: account.orgName ?? account.name ?? undefined,
          email: account.email ?? undefined
        }
      };
    }
  });
