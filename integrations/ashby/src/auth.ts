import { SlateAuth } from 'slates';
import { z } from 'zod';
import { AshbyClient } from './lib/client';
import { credential, row, str } from './lib/contracts';

export const auth = SlateAuth.create()
  .output(z.object({ token: z.string(), apiVersion: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'API key from Ashby Developer Settings. Enable apiKeysRead for identity verification and the individual read/write permissions needed by your tools.'
        )
    }),
    getOutput: async ctx => {
      const token = credential(ctx.input.token);
      const info = row((await new AshbyClient({ token }).post('/apiKey.info')).results);
      return { output: { token, apiVersion: str(info.version) } };
    },
    getProfile: async (ctx: { output: { token: string; apiVersion?: string } }) => {
      const info = row((await new AshbyClient(ctx.output).post('/apiKey.info')).results);
      return { profile: { name: str(info.title) } };
    }
  });
