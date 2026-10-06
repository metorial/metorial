import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { AffinityClient } from './lib/client';

export const auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Affinity API key from Settings > Manage Apps. Its permissions are those of the key owner.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('An Affinity API key is required.');
      return { output: { token: ctx.input.token } };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      const identity = await new AffinityClient(ctx.output.token).whoAmI();
      return {
        profile: {
          id: String(identity.user.id),
          email: identity.user.email,
          name: `${identity.user.firstName} ${identity.user.lastName}`.trim()
        }
      };
    }
  });
