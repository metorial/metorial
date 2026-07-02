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
        .describe('OpsGenie API key (Integration API key or Account-level API key)')
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
        baseURL: 'https://api.opsgenie.com',
        headers: {
          Authorization: `GenieKey ${ctx.output.token}`
        }
      });

      try {
        let response = await http.get('/v2/account');
        let account = response.data.data;
        return {
          profile: {
            id: account.id ?? undefined,
            name: account.name ?? undefined
          }
        };
      } catch {
        return {
          profile: {}
        };
      }
    }
  });
