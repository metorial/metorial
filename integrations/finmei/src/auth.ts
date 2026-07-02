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
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      apiToken: z
        .string()
        .describe(
          'Finmei API token. Go to Settings → Integrations in the Finmei app to generate one.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiToken: string } }) => {
      let client = createAxios({
        baseURL: 'https://app.finmei.com/api',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await client.get('/profile');
      let data = response.data as {
        id?: string;
        name?: string;
        email?: string;
        business_name?: string;
      };

      return {
        profile: {
          id: data.id ? String(data.id) : undefined,
          name: data.name || data.business_name,
          email: data.email
        }
      };
    }
  });
