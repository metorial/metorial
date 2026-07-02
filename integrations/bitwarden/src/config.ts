import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    serverUrl: z
      .enum(['https://api.bitwarden.com', 'https://api.bitwarden.eu'])
      .default('https://api.bitwarden.com')
      .describe('Bitwarden API server URL. Use the US or EU cloud endpoint.')
  })
);
