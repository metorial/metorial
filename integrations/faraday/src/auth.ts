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
        .describe('Faraday API key from the Settings page in your Faraday dashboard')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.apiKey
      }
    }),
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let client = createAxios({
        baseURL: 'https://api.faraday.ai/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await client.get('/accounts/current');
      let account = response.data;

      return {
        profile: {
          id: account.id,
          name: account.name
        }
      };
    }
  });
