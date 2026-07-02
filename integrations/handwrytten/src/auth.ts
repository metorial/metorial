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
          'Handwrytten API key. Found under Profile > Integrations in your Handwrytten account.'
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
        baseURL: 'https://api.handwrytten.com/v1',
        headers: {
          Authorization: ctx.output.token,
          Accept: 'application/json'
        }
      });

      let response = await client.get('/auth/getUser');
      let user = response.data;

      return {
        profile: {
          id: String(user.user_id ?? ''),
          email: user.email ?? '',
          name: [user.fname, user.lname].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
