import { SlateAuth } from 'slates';
import { z } from 'zod';
import { SanityClient } from './lib/client';
import { tokenValue } from './lib/http';

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
          'A personal or robot API token with the required project/dataset permissions. Robot tokens do not expose user identity.'
        )
    }),
    getOutput: async ctx => ({ output: { token: tokenValue(ctx.input.token) } }),
    getProfile: async (ctx: { output: { token: string } }) => ({
      profile: await new SanityClient({ token: ctx.output.token }).profile()
    })
  });
