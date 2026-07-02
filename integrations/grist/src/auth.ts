import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      serverUrl: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Grist API key (generated from Profile Settings in the Grist UI)'),
      serverUrl: z
        .string()
        .describe(
          'Base URL of the Grist instance (e.g., "https://docs.getgrist.com", "https://myteam.getgrist.com", or a self-hosted URL)'
        )
    }),
    getOutput: async ctx => {
      let serverUrl = ctx.input.serverUrl.replace(/\/+$/, '');
      return {
        output: {
          token: ctx.input.apiKey,
          serverUrl
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; serverUrl: string };
      input: { apiKey: string; serverUrl: string };
    }) => {
      let axios = createAxios({
        baseURL: `${ctx.output.serverUrl}/api`,
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });
      let response = await axios.get('/profile/user');
      let user = response.data;
      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: user.name
        }
      };
    }
  });
