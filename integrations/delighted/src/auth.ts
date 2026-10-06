import { SlateAuth } from 'slates';
import { z } from 'zod';
import { rejectUnavailableDelighted } from './lib/unavailable';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Legacy Delighted API key field retained for compatibility. Customer access ended on July 1, 2026; do not enter new credentials.'
        )
    }),
    getOutput: async () => rejectUnavailableDelighted(),
    getProfile: async () => rejectUnavailableDelighted()
  });
