import { SlateAuth } from 'slates';
import { z } from 'zod';
import { EverhourClient } from './lib/client';

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

    getProfile: async (ctx: { output: { token: string } }) => {
      let user = await new EverhourClient(ctx.output.token).getCurrentUser();
      return {
        profile: {
          id: String(user.id),
          name: user.name,
          imageUrl: user.avatarUrl ?? undefined
        }
      };
    }
  });
