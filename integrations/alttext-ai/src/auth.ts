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
      apiKey: z.string().describe('Your AltText.ai API key. Found in Account > API Keys.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let client = createAxios({
        baseURL: 'https://alttext.ai/api/v1'
      });

      let response = await client.get('/account', {
        headers: {
          'X-API-Key': ctx.output.token
        }
      });

      let account = response.data;

      return {
        profile: {
          name: account.display_name || account.email,
          email: account.email
        }
      };
    }
  });
