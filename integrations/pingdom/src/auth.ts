import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      accountEmail: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Pingdom API token. Generate one from My Pingdom → Integrations → The Pingdom API.'
        ),
      accountEmail: z
        .string()
        .optional()
        .describe('Account owner email, required only for multi-account (enterprise) setups.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          accountEmail: ctx.input.accountEmail
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; accountEmail?: string };
      input: { token: string; accountEmail?: string };
    }) => {
      let http = createAxios({
        baseURL: 'https://api.pingdom.com/api/3.1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/credits');

      return {
        profile: {
          name: 'Pingdom Account',
          ...response.data
        }
      };
    }
  });
