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
        .describe('Toggl Track API token. Found under "My Profile" in your Toggl account.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://api.track.toggl.com/api/v9',
        headers: {
          Authorization: `Basic ${btoa(`${ctx.output.token}:api_token`)}`,
          'Content-Type': 'application/json'
        }
      });

      let response = await http.get('/me');
      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email ?? undefined,
          name: user.fullname ?? user.email,
          imageUrl: user.image_url ?? undefined
        }
      };
    }
  });
