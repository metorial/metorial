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
        .describe('Northflank API token generated from account or team settings')
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
        baseURL: 'https://api.northflank.com/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });
      try {
        let response = await axios.get('/me');
        let user = response.data?.data?.user;
        return {
          profile: {
            id: user?.id,
            name: user?.name,
            email: user?.email
          }
        };
      } catch {
        return {
          profile: {}
        };
      }
    }
  });
