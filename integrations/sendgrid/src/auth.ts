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
        .describe('SendGrid API Key. Create one in the SendGrid UI under Settings > API Keys.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://api.sendgrid.com/v3',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/user/profile');
      let profile = response.data;

      return {
        profile: {
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          email: profile.email
        }
      };
    }
  });
