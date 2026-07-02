import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      apiId: z.string(),
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiId: z
        .string()
        .describe(
          'Your VictorOps API ID (X-VO-Api-Id). Found under Integrations >> API in your VictorOps account.'
        ),
      apiKey: z
        .string()
        .describe(
          'Your VictorOps API Key (X-VO-Api-Key). Only admin users can create API keys.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          apiId: ctx.input.apiId,
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: {
      output: { apiId: string; token: string };
      input: { apiId: string; apiKey: string };
    }) => {
      let axios = createAxios({
        baseURL: 'https://api.victorops.com',
        headers: {
          'X-VO-Api-Id': ctx.output.apiId,
          'X-VO-Api-Key': ctx.output.token
        }
      });

      let response = await axios.get('/api-public/v1/user');
      let users = response.data?.users ?? [];

      return {
        profile: {
          name: users.length > 0 ? `${users[0].firstName} ${users[0].lastName}` : undefined,
          email: users.length > 0 ? users[0].email : undefined
        }
      };
    }
  });
