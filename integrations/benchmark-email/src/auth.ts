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
      token: z.string()
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
        baseURL: 'https://clientapi.benchmarkemail.com'
      });

      let response = await axios.get('/Client/ProfileDetails', {
        headers: {
          AuthToken: ctx.output.token,
          'Content-Type': 'application/json'
        }
      });

      let data = response.data?.Response?.Data;

      return {
        profile: {
          id: data?.['Client ID'] ?? undefined,
          email: data?.Email ?? undefined,
          name:
            [data?.['First Name'], data?.['Last Name']].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
