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
      apiKey: z
        .string()
        .describe(
          'Your Route4Me API key. Found under Security > API Key or Account Settings > Integrations > API Key.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let http = createAxios({
        baseURL: 'https://api.route4me.com'
      });

      let response = await http.get('/api.v4/user.php', {
        params: {
          api_key: ctx.output.token
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.member_id?.toString(),
          email: user.member_email,
          name:
            [user.member_first_name, user.member_last_name].filter(Boolean).join(' ') ||
            undefined
        }
      };
    }
  });
