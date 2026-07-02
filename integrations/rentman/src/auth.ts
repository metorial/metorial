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
        .describe(
          'Rentman API token. Generate at Configuration > Account > Integrations in Rentman.'
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
        baseURL: 'https://api.rentman.net'
      });

      let response = await axios.get('/crew/current', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data?.data;

      return {
        profile: {
          id: user?.id?.toString(),
          name: [user?.firstname, user?.surname].filter(Boolean).join(' ') || undefined,
          email: user?.email || undefined
        }
      };
    }
  });
