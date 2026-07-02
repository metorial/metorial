import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiUser: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your Pointagram API key (found in Settings > Integrations > Custom Integration)'
        ),
      apiUser: z.string().describe('Your Pointagram login email address')
    }),

    getOutput: async ctx => {
      let http = createAxios({
        baseURL: 'https://app.pointagram.com/server/externalapi.php'
      });

      await http.get('/test', {
        headers: {
          api_key: ctx.input.apiKey,
          api_user: ctx.input.apiUser,
          'Content-Type': 'application/json'
        }
      });

      return {
        output: {
          token: ctx.input.apiKey,
          apiUser: ctx.input.apiUser
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; apiUser: string };
      input: { apiKey: string; apiUser: string };
    }) => {
      return {
        profile: {
          email: ctx.output.apiUser
        }
      };
    }
  });
