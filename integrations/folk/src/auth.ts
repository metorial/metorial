import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Folk API key from workspace Settings > API. The key grants access according to its associated user and group permissions.'
        )
    }),
    getOutput: async ctx => {
      await new Client({ token: ctx.input.apiKey }).getCurrentUser();
      return { output: { token: ctx.input.apiKey.trim() } };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      const user = await new Client({ token: ctx.output.token }).getCurrentUser();
      return { profile: { id: user.id, name: user.fullName, email: user.email } };
    }
  });
