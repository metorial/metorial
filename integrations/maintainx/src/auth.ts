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
        .describe(
          'MaintainX API Key. Generate one from Settings > Integrations > New Key in your MaintainX account.'
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
        baseURL: 'https://api.getmaintainx.com/v1'
      });

      let response = await axios.get('/users', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        },
        params: {
          limit: 1
        }
      });

      let user = response.data?.users?.[0];

      return {
        profile: {
          id: user?.id?.toString(),
          name: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : undefined,
          email: user?.email
        }
      };
    }
  });
