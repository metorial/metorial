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
          'Your Everhour API token. Found in Settings > My Profile > Application Access.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let client = createAxios({
        baseURL: 'https://api.everhour.com'
      });

      let response = await client.get('/users/me', {
        headers: {
          'X-Api-Key': ctx.output.token
        }
      });

      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          name: user.name,
          imageUrl: user.avatarUrl
        }
      };
    }
  });
