import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://api4.nozbe.com/v1/api'
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
        .describe(
          'Your Nozbe API token. Generate one at Settings → API tokens in your Nozbe account.'
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
      let response = await http.get('/users', {
        headers: {
          Authorization: ctx.output.token
        },
        params: {
          fields: 'id,name,invitation_email,avatar_url',
          limit: 1
        }
      });

      let user = response.data?.[0];

      return {
        profile: {
          id: user?.id,
          name: user?.name,
          email: user?.invitation_email,
          imageUrl: user?.avatar_url
        }
      };
    }
  });
