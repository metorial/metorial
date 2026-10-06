import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { id, regionFor, regions, token } from './lib/validation';

export const auth = SlateAuth.create()
  .output(z.object({ token: z.string(), region: regions.optional() }))
  .addTokenAuth({
    type: 'auth.token',
    key: 'api_token',
    name: 'API Token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'An integrator.io service token or personal access token. Its permissions and environment are determined by Celigo.'
        ),
      region: regions
        .optional()
        .describe('Region where this token was issued: US, EU, Australia, or Canada.')
    }),
    getOutput: async ctx => ({
      output: { token: token(ctx.input.token), region: regionFor(ctx.input, ctx.config) }
    }),
    getProfile: async (ctx: {
      output: { token: string; region?: 'us' | 'eu' | 'au' | 'ca' };
    }) => {
      const info = await new Client(ctx.output).tokenInfo();
      return { profile: { id: id(info._userId, 'token owner ID') } };
    }
  });
