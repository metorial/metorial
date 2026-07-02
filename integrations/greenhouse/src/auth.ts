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
          'Greenhouse Harvest API key. Generated in Configure > Dev Center > API Credential Management.'
        )
    }),

    getOutput: async ctx => ({
      output: { token: ctx.input.token }
    }),

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = createAxios({
        baseURL: 'https://harvest.greenhouse.io/v1',
        headers: {
          Authorization: `Basic ${btoa(`${ctx.output.token}:`)}`
        }
      });

      let response = await client.get('/users', { params: { per_page: 1 } });
      let users = response.data as any[];
      let firstUser = users?.[0];

      return {
        profile: {
          id: firstUser?.id?.toString(),
          name: firstUser ? `${firstUser.name || 'Greenhouse User'}` : 'Greenhouse API Key',
          email: firstUser?.primary_email_address
        }
      };
    }
  });
