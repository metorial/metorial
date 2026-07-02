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
          'Affinda API key. Generate one in Settings → API Keys in the Affinda dashboard.'
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
      let httpClient = createAxios({
        baseURL: 'https://api.affinda.com/v3',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await httpClient.get('/organizations');
      let orgs = response.data as Array<{ identifier: string; name: string }>;
      let firstOrg = orgs[0];

      return {
        profile: {
          id: firstOrg?.identifier,
          name: firstOrg?.name
        }
      };
    }
  });
