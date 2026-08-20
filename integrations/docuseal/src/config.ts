import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .enum(['https://api.docuseal.com', 'https://api.docuseal.eu'])
        .default('https://api.docuseal.com')
        .describe('DocuSeal API base URL. Use US or EU cloud.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
