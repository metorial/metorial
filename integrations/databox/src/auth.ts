import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let axios = createAxios({
  baseURL: 'https://api.databox.com'
});

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
          'Databox API key. Found under Account Management > Profile > Password & Security.'
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
      await axios.get('/v1/auth/validate-key', {
        headers: {
          'x-api-key': ctx.output.token
        }
      });

      return {
        profile: {
          id: ctx.output.token.slice(0, 8),
          name: 'Databox User'
        }
      };
    }
  });
