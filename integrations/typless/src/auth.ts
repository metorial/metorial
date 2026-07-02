import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let axios = createAxios({
  baseURL: 'https://developers.typless.com/api/'
});

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
        .describe('Typless API key found on the Settings page of the Typless dashboard')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let response = await axios.get('/user-profile/', {
        headers: {
          Authorization: `Token ${ctx.output.token}`
        }
      });

      let profile = response.data;

      return {
        profile: {
          id: profile.email,
          email: profile.email,
          name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
