import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let apiClient = createAxios({
  baseURL: 'https://app.bettercontact.rocks/api/v2'
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
        .describe('Your BetterContact API key, found in the API section of your dashboard')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let response = await apiClient.get('/account', {
        headers: {
          'X-API-Key': ctx.output.token
        }
      });

      return {
        profile: {
          email: response.data.email,
          creditsLeft: response.data.credits_left
        }
      };
    }
  });
