import { SlateAuth } from 'slates';
import { z } from 'zod';
import { lmntShutdownError } from './retirement';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key (Retired)',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Legacy LMNT API key. LMNT has shut down; new connections are unavailable.')
    }),
    getOutput: async () => {
      throw lmntShutdownError();
    },
    getProfile: async () => {
      throw lmntShutdownError();
    }
  });
