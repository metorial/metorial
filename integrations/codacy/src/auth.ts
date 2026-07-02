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
    name: 'Account API Token',
    key: 'account_api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .describe(
          'Codacy Account API Token. Generate one from your Codacy account under Account > Access management > Create API token.'
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
      let client = createAxios({
        baseURL: 'https://app.codacy.com/api/v3',
        headers: {
          'api-token': ctx.output.token
        }
      });

      let response = await client.get('/user');
      let user = response.data;

      return {
        profile: {
          id: String(user.id ?? ''),
          email: user.mainEmail ?? user.email ?? '',
          name: user.name ?? '',
          imageUrl: user.avatarUrl ?? ''
        }
      };
    }
  });
