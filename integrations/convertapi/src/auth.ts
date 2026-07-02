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
          'ConvertAPI API Token. Create and manage tokens at https://www.convertapi.com/a/api-tokens'
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
      let client = createAxios({
        baseURL: 'https://v2.convertapi.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await client.get('/user');
      let user = response.data as { ApiKey: number; FullName: string; Email: string };

      return {
        profile: {
          id: String(user.ApiKey),
          name: user.FullName,
          email: user.Email
        }
      };
    }
  });
