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
          'Scrapfly API key (format: scp-live-xxx or scp-test-xxx). Found on the Scrapfly dashboard.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let http = createAxios({
        baseURL: 'https://api.scrapfly.io'
      });

      let response = await http.get('/account', {
        params: {
          key: ctx.output.token
        }
      });

      let account = response.data;

      return {
        profile: {
          id: account.account?.id ?? account.project?.name,
          name: account.project?.name ?? 'Scrapfly Account'
        }
      };
    }
  });
