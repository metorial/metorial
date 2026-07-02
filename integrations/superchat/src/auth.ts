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
          'Your Superchat API key. Found under Settings > Integrations > API Key in the Superchat dashboard. Requires administrator access.'
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
        baseURL: 'https://api.superchat.com/v1.0',
        headers: {
          'X-API-KEY': ctx.output.token
        }
      });

      let response = await axios.get('/me');

      return {
        profile: {
          id: response.data.id,
          email: response.data.email,
          name: response.data.name
        }
      };
    }
  });
