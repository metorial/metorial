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
          'Your OnceHub API key. Found in Account Settings > API & Webhooks Integration.'
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
        baseURL: 'https://api.oncehub.com/v2',
        headers: {
          'API-Key': ctx.output.token,
          'Content-Type': 'application/json'
        }
      });

      let response = await http.get('/users/me');
      let user = response.data;

      return {
        profile: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      };
    }
  });
