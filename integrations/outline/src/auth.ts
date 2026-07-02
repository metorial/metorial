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
        .describe('Outline API token (starts with ol_api_). Found in Settings → API.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let axios = createAxios({});
      let response = await axios.post(
        '/auth.info',
        {},
        {
          baseURL: 'https://app.getoutline.com/api',
          headers: {
            Authorization: `Bearer ${ctx.output.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      let user = response.data?.data?.user;
      let team = response.data?.data?.team;
      return {
        profile: {
          id: user?.id,
          name: user?.name,
          email: user?.email,
          imageUrl: user?.avatarUrl,
          teamName: team?.name,
          teamId: team?.id
        }
      };
    }
  });
