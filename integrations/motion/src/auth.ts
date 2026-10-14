import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { MotionClient } from './lib/client';

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
        .describe('Motion API key. Create one in Motion Settings under the API tab.')
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('Enter a valid Motion API key.');
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let profile = await new MotionClient({ token: ctx.output.token }).getMe();

      return {
        profile: {
          id: profile.id,
          email: profile.email,
          name: profile.name
        }
      };
    }
  });
