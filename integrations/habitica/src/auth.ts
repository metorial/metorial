import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      userId: z.string(),
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Credentials',
    key: 'api_credentials',

    inputSchema: z.object({
      userId: z
        .string()
        .describe('Habitica User ID (found under Settings > Site Data or Settings > API)'),
      apiToken: z
        .string()
        .describe('Habitica API Token (found under Settings > Site Data or Settings > API)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          userId: ctx.input.userId,
          token: ctx.input.apiToken
        }
      };
    },

    getProfile: async (ctx: {
      output: { userId: string; token: string };
      input: { userId: string; apiToken: string };
    }) => {
      let axios = createAxios({
        baseURL: 'https://habitica.com/api/v3',
        headers: {
          'x-api-user': ctx.output.userId,
          'x-api-key': ctx.output.token,
          'x-client': `${ctx.output.userId}-SlatesIntegration`,
          'Content-Type': 'application/json'
        }
      });

      let response = await axios.get('/user', {
        params: { userFields: 'profile,auth' }
      });

      let userData = response.data?.data;

      return {
        profile: {
          id: ctx.output.userId,
          name: userData?.profile?.name || userData?.auth?.local?.username,
          imageUrl: userData?.profile?.imageUrl
        }
      };
    }
  });
