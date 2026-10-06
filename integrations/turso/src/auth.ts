import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export const auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Turso Platform API token. Prefer an organization-scoped token; database SQL tokens cannot manage the Platform API.'
        )
    }),
    getOutput: async ctx => {
      await new Client({ token: ctx.input.token }).validateApiToken();
      return { output: { token: ctx.input.token } };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      const { user } = await new Client({ token: ctx.output.token }).getCurrentUser();
      return {
        profile: {
          id: user.username,
          name: user.name || user.username,
          email: user.email,
          image: user.avatarUrl
        }
      };
    }
  });
