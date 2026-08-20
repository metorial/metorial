import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://app.documenso.com/api/v2')
        .describe('Base URL for the Documenso API. Override for self-hosted instances.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
