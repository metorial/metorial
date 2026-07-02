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
        .describe('Your Mailsoftly API key. Found in your Mailsoftly account settings.')
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
        baseURL: 'https://app.mailsoftly.com/api/v3',
        headers: {
          Authorization: ctx.output.token,
          'Content-Type': 'application/json'
        }
      });

      let response = await client.post('/authentication');

      return {
        profile: {
          id: String(response.data.firm_id ?? response.data.id ?? ''),
          name: response.data.firm_name ?? response.data.name ?? '',
          adminName: response.data.admin_name ?? ''
        }
      };
    }
  });
