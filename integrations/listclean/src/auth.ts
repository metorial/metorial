import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe('Listclean API key used for authentication via X-Auth-Token header')
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
          'Your Listclean API token. Generate one from the API Tokens section in your account settings.'
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
        baseURL: 'https://api.listclean.xyz/v1',
        headers: {
          'X-Auth-Token': ctx.output.token,
          'Content-Type': 'application/json'
        }
      });

      let res = await axios.get('/account/profile/');
      let profile = res.data;

      return {
        profile: {
          id: profile.id ? String(profile.id) : undefined,
          email: profile.email,
          name: profile.name || profile.username
        }
      };
    }
  });
