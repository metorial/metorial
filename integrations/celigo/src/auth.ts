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
          'Celigo API token. Generate one in integrator.io under Resources → API tokens.'
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
      let ax = createAxios({
        baseURL: 'https://api.integrator.io/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/json'
        }
      });

      let response = await ax.get('/tokenInfo');
      let tokenInfo = response.data;

      return {
        profile: {
          id: tokenInfo._userId,
          name: tokenInfo._userId,
          scope: tokenInfo.scope
        }
      };
    }
  });
