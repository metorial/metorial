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
      apiToken: z
        .string()
        .describe(
          'AppVeyor API token. Can be found at https://ci.appveyor.com/api-keys. Supports both account-level (v1) and user-level (v2) tokens.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiToken: string } }) => {
      let axios = createAxios({
        baseURL: 'https://ci.appveyor.com/api',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/json'
        }
      });

      let response = await axios.get('/users');
      let users = response.data;
      let firstUser = Array.isArray(users) && users.length > 0 ? users[0] : null;

      return {
        profile: {
          id: firstUser?.userId?.toString(),
          name: firstUser?.fullName,
          email: firstUser?.email
        }
      };
    }
  });
