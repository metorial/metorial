import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

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
        .trim()
        .min(1)
        .describe('CalendarHero API token. Found in My Account > My Profile Settings > API.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let user = await new Client(ctx.output.token).getUser();
      return {
        profile: {
          id: user._id || user.id || user.vendastaUserId || user.email,
          email: user.email,
          name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          imageUrl: user.avatar || user.photo || user.imageUrl
        }
      };
    }
  });
