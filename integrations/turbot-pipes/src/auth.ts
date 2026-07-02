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
          'Turbot Pipes API token (starts with tpt_). Generate from Settings > Advanced > Credentials & Access.'
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
        baseURL: 'https://pipes.turbot.com/api/v0',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/actor');
      let actor = response.data;

      return {
        profile: {
          id: actor.id,
          name: actor.display_name,
          email: actor.email,
          handle: actor.handle,
          imageUrl: actor.avatar_url
        }
      };
    }
  });
