import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Access Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .min(1)
        .describe(
          'Buildkite API access token from Personal Settings > API Access Tokens. Include read_user for identity and the scopes needed by your operations.'
        )
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.token } }),
    getProfile: async (ctx: { output: { token: string } }) => {
      const user = await new Client({ token: ctx.output.token }).getCurrentUser();
      return {
        profile: { id: user.id, name: user.name, email: user.email, imageUrl: user.avatar_url }
      };
    }
  });
