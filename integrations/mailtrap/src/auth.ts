import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let apiAxios = createAxios({
  baseURL: 'https://mailtrap.io'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
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
          'Mailtrap API token. Generate one in Settings → API Tokens in the Mailtrap dashboard.'
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
      let response = await apiAxios.get('/api/accounts', {
        headers: {
          'Api-Token': ctx.output.token
        }
      });
      let accounts = response.data;
      let account = accounts?.[0];
      return {
        profile: {
          id: account?.id?.toString(),
          name: account?.name
        }
      };
    }
  });
