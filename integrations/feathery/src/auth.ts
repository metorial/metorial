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
        .describe(
          'Your Feathery admin API key. Found in account settings of the Feathery dashboard. API keys are environment-specific (production, development, etc.).'
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
      let axios = createAxios({
        baseURL: 'https://api.feathery.io'
      });
      let response = await axios.get('/api/account/', {
        headers: {
          Authorization: `Token ${ctx.output.token}`
        }
      });
      let account = response.data;
      return {
        profile: {
          id: account.id || account.email,
          email: account.email,
          name: account.name || account.email
        }
      };
    }
  });
