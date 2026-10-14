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
          'Your OnceHub API key. Create one under Account Integrations > APIs & Webhooks.'
        )
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.apiKey } }),
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let identity = await new Client({ token: ctx.output.token }).getAccountIdentity();
      return {
        profile: {
          id: identity.accountEmail ?? identity.message,
          name: identity.accountEmail ?? 'OnceHub Account',
          email: identity.accountEmail ?? undefined
        }
      };
    }
  });
