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
          'Shortcut API token. Generate one at https://app.shortcut.com/settings/account/api-tokens'
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
      let http = createAxios({
        baseURL: 'https://api.app.shortcut.com/api/v3',
        headers: {
          'Shortcut-Token': ctx.output.token,
          'Content-Type': 'application/json'
        }
      });

      let response = await http.get('/member');
      let member = response.data;

      return {
        profile: {
          id: member.id,
          name: member.profile?.name || member.profile?.mention_name,
          email: member.profile?.email_address,
          imageUrl: member.profile?.display_icon?.url
        }
      };
    }
  });
