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
      token: z
        .string()
        .describe('Your sevDesk API token. Found in Settings > User in the sevDesk web UI.')
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
        baseURL: 'https://my.sevdesk.de/api/v1',
        headers: {
          Authorization: ctx.output.token
        }
      });

      let response = await axios.get('/SevUser', {
        params: { limit: 1 }
      });

      let user = response.data?.objects?.[0];
      if (user) {
        return {
          profile: {
            id: String(user.id),
            email: user.email ?? undefined,
            name:
              [user.firstName, user.lastName].filter(Boolean).join(' ') ||
              user.username ||
              undefined
          }
        };
      }

      return { profile: {} };
    }
  });
