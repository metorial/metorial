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
        .min(1)
        .describe(
          'PersistIQ API key. Found under Settings > Integrations > API Key in your dashboard.'
        )
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.apiKey } }),
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      await new Client({ token: ctx.output.token }).listUsers();
      // The API lists all team users; it does not identify the API key owner.
      return { profile: {} };
    }
  });
