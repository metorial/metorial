import { createApiServiceError, SlateAuth } from 'slates';
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
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Klipfolio API key. Generate from My Profile or Users in the Klipfolio app.')
    }),

    getOutput: async ctx => {
      if (
        typeof ctx.input.token !== 'string' ||
        !ctx.input.token.trim() ||
        /[\r\n]/.test(ctx.input.token)
      )
        throw createApiServiceError('A nonempty Klipfolio API key is required.', {
          reason: 'invalid_auth'
        });
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let profile = await new Client({ token: ctx.output.token }).getProfile();
      if (typeof profile?.id !== 'string' || !profile.id.trim())
        throw createApiServiceError('Klipfolio did not return an authenticated profile ID.', {
          reason: 'invalid_response'
        });
      return {
        profile: {
          id: profile?.id,
          email: profile?.email,
          name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
        }
      };
    }
  });
