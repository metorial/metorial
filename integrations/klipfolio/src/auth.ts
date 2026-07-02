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
        .describe('Klipfolio API key. Generate from My Profile or Users in the Klipfolio app.')
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
        baseURL: 'https://app.klipfolio.com/api/1.0'
      });

      let response = await axios.get('/profile', {
        headers: {
          'kf-api-key': ctx.output.token
        }
      });

      let profile = response.data?.data;
      return {
        profile: {
          id: profile?.id,
          email: profile?.email,
          name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
        }
      };
    }
  });
