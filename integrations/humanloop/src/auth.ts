import { SlateAuth } from 'slates';
import { z } from 'zod';
import { rejectHumanloopOperation } from './lib/retirement';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key (retired)',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Legacy Humanloop API key. Humanloop retired on September 8, 2025; new connections are unavailable.'
        )
    }),
    getOutput: async () => rejectHumanloopOperation()
  });
