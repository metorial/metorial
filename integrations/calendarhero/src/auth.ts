import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let httpClient = createAxios({
  baseURL: 'https://api.calendarhero.com'
});

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
        .describe('CalendarHero API token. Found in My Account > My Profile Settings > API.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let response = await httpClient.get('/user', {
        headers: {
          Authorization: ctx.output.token
        }
      });

      let user = response.data;
      return {
        profile: {
          id: user._id || user.id,
          email: user.email,
          name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          imageUrl: user.photo || user.imageUrl
        }
      };
    }
  });
