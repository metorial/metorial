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
      token: z
        .string()
        .describe('Eventzilla API key from Settings > Developers > API Credentials')
    }),
    getOutput: async ctx => {
      new Client({ token: ctx.input.token });
      return { output: { token: ctx.input.token } };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      await new Client({ token: ctx.output.token }).listUsers({ limit: 1 });
      // This endpoint lists organizers; it does not identify the API-key owner.
      return { profile: {} };
    }
  });
