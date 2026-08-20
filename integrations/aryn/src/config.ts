import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://api.aryn.cloud')
        .describe('Aryn API base URL. Use https://api.eu.aryn.cloud for the EU region.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
