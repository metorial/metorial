import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export const auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'User-specific Databox API key from Profile > Password & Security. The key inherits its creator’s permissions and any IP allowlist.'
        )
    }),
    getOutput: async ctx => {
      const client = new Client({ token: ctx.input.apiKey });
      await client.validateKey();
      return { output: { token: ctx.input.apiKey } };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      const user = await new Client({ token: ctx.output.token }).getCurrentUser();
      return { profile: { id: String(user.id), name: user.name } };
    }
  });
