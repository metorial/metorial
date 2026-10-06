import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { V0Client } from './lib/client';

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
      token: z.string().describe('v0 API key from v0.app/settings')
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim()) throw createApiServiceError('A v0 API key is required.');
      return {
        output: {
          token: ctx.input.token.trim()
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let user = await new V0Client(ctx.output.token).getUser();
      if (!user.id || !user.email)
        throw createApiServiceError('v0 did not return the authenticated user identity.');

      return {
        profile: {
          id: user.id,
          name: user.name,
          email: user.email,
          imageUrl: user.avatar
        }
      };
    }
  });
