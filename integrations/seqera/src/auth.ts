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
    name: 'Access Token',
    key: 'access_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Seqera Platform personal access token. Generate one from User tokens in your Seqera UI.'
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
      let http = createAxios({
        baseURL: 'https://api.cloud.seqera.io',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          Accept: 'application/json'
        }
      });

      let response = await http.get('/user-info');
      let data = response.data as {
        user?: {
          id?: number;
          userName?: string;
          email?: string;
          firstName?: string;
          lastName?: string;
          avatar?: string;
        };
      };

      let user = data.user;
      let name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.userName;

      return {
        profile: {
          id: user?.id != null ? String(user.id) : undefined,
          email: user?.email,
          name: name || undefined,
          imageUrl: user?.avatar
        }
      };
    }
  });
