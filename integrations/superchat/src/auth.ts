import { SlateAuth } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from './lib/client';

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
          'Your Superchat API key. Found under Settings > API in the Superchat dashboard. Requires administrator access.'
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
      let user = await new SuperchatClient(ctx.output).getMe();

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      };
    }
  });
