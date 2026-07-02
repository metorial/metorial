import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiKey: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key & Token',
    key: 'api_key_token',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Trello API Key from your Power-Up admin page (https://trello.com/power-ups/admin)'
        ),
      token: z.string().describe('Trello User Token generated via the authorize route')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          apiKey: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://api.trello.com/1'
      });

      let response = await http.get('/members/me', {
        params: {
          key: ctx.output.apiKey,
          token: ctx.output.token,
          fields: 'id,fullName,username,email,avatarUrl'
        }
      });

      let member = response.data as {
        id: string;
        fullName?: string;
        username?: string;
        email?: string;
        avatarUrl?: string;
        avatarHash?: string;
      };

      let imageUrl: string | undefined;
      if (member.avatarHash) {
        imageUrl = `https://trello-members.s3.amazonaws.com/${member.id}/${member.avatarHash}/170.png`;
      }

      return {
        profile: {
          id: member.id,
          name: member.fullName || member.username,
          email: member.email,
          imageUrl
        }
      };
    }
  });
