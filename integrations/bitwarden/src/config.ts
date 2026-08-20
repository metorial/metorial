import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    serverUrl: {
      schema: z
        .enum(['https://api.bitwarden.com', 'https://api.bitwarden.eu'])
        .default('https://api.bitwarden.com')
        .describe('Bitwarden API server URL. Use the US or EU cloud endpoint.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
