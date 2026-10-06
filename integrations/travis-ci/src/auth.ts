import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { hostedBaseUrl, normalizeBaseUrl, TravisCIClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string(), baseUrl: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z.string().describe('Travis CI API token from Account Settings > API Token.'),
      baseUrl: z
        .string()
        .default(hostedBaseUrl)
        .describe(
          'API endpoint: https://api.travis-ci.com for hosted Travis CI, or https://YOUR-INSTANCE/api for Enterprise. The retired .org service is unsupported.'
        )
    }),
    getOutput: async ctx => {
      const token = ctx.input.token.trim();
      if (!token) throw createApiServiceError('A Travis CI API token is required.');
      return { output: { token, baseUrl: normalizeBaseUrl(ctx.input.baseUrl) } };
    },
    getProfile: async (ctx: { output: { token: string; baseUrl?: string } }) => {
      const user = await new TravisCIClient({
        token: ctx.output.token,
        baseUrl: ctx.output.baseUrl
      }).getCurrentUser();
      return {
        profile: {
          id: String(user.id),
          name: user.name || user.login,
          email: user.email ?? undefined,
          imageUrl: user.avatar_url ?? undefined,
          login: user.login
        }
      };
    }
  });
