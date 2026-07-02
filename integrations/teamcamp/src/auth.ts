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
          'Your Teamcamp API key. Generate one from your Teamcamp Account Settings at https://dash.teamcamp.app/settings/apikey'
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
        baseURL: 'https://api.teamcamp.app/v1.0',
        headers: {
          apiKey: ctx.output.token
        }
      });

      let _response = await axios.get('/verify');
      let users = await axios.get('/company/users');
      let firstUser = Array.isArray(users.data) ? users.data[0] : null;

      return {
        profile: {
          id: firstUser?.id,
          email: firstUser?.email,
          name: firstUser?.name
        }
      };
    }
  });
