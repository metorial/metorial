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
        .describe('Your incident.io API key. Create one in Settings > API keys.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let axios = createAxios({
        baseURL: 'https://api.incident.io'
      });

      let response = await axios.get('/v1/identity', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let identity = response.data.identity;

      return {
        profile: {
          name: identity.name,
          dashboardUrl: identity.dashboard_url,
          roles: identity.roles
        }
      };
    }
  });
