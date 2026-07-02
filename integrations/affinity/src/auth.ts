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
        .describe('Affinity API key. Generate from Settings > API in the Affinity web app.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = createAxios({
        baseURL: 'https://api.affinity.co'
      });

      let response = await client.get('/auth/whoami', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: String(user.user?.id ?? ''),
          email: user.user?.email ?? '',
          name: `${user.user?.first_name ?? ''} ${user.user?.last_name ?? ''}`.trim()
        }
      };
    }
  });
