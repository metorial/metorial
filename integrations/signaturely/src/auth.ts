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
          'Signaturely API Key. Generate one from https://app.signaturely.com/settings/api'
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
        baseURL: 'https://api.signaturely.com/api/v1'
      });

      let response = await axios.get('/user/by-api', {
        headers: {
          Authorization: `Api-Key ${ctx.output.token}`,
          'Content-Type': 'application/json'
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id?.toString(),
          email: user.email,
          name: user.name || user.fullName
        }
      };
    }
  });
