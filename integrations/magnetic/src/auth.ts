import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://app.magnetichq.com/Magnetic/rest/coreAPI'
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
          'Your Magnetic API token. Find it at https://app.magnetichq.com/Magnetic/API.do while logged in.'
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
      let response = await http.get('/user', {
        params: {
          token: ctx.output.token
        }
      });

      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          name: user.fullName,
          email: user.email
        }
      };
    }
  });
