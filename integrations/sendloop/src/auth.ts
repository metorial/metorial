import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Sendloop API key')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('Your Sendloop API key from Settings > API Settings')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let axios = createAxios();

      let response = await axios.post(
        `https://app.sendloop.com/api/v3/Account.Info.Get/json`,
        new URLSearchParams({ APIKey: ctx.output.token }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;

      return {
        profile: {
          name: data.AccountName || data.CompanyName || undefined,
          email: data.EmailAddress || undefined
        }
      };
    }
  });
