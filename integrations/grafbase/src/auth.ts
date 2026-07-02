import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Grafbase personal or organization access token')
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
          'Grafbase personal access token or organization access token. Created from account settings > access tokens.'
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
      let axios = createAxios({
        baseURL: 'https://api.grafbase.com'
      });

      let response = await axios.post(
        '/graphql',
        {
          query: `query { viewer { user { id name } } }`
        },
        {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let user = response.data?.data?.viewer?.user;

      return {
        profile: {
          id: user?.id,
          name: user?.name
        }
      };
    }
  });
