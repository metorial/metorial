import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      userId: z.string(),
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      userId: z
        .string()
        .describe(
          'Your OnePageCRM user_id. Found at https://app.onepagecrm.com/app/api under the Configuration tab.'
        ),
      apiKey: z
        .string()
        .describe(
          'Your OnePageCRM api_key. Found at https://app.onepagecrm.com/app/api under the Configuration tab.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          userId: ctx.input.userId,
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: {
      output: { userId: string; token: string };
      input: { userId: string; apiKey: string };
    }) => {
      let axios = createAxios({
        baseURL: 'https://app.onepagecrm.com/api/v3',
        auth: {
          username: ctx.output.userId,
          password: ctx.output.token
        }
      });

      let response = await axios.get('/users/profile.json');
      let user = response.data?.data?.user;

      return {
        profile: {
          id: user?.id || ctx.output.userId,
          email: user?.email,
          name: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
