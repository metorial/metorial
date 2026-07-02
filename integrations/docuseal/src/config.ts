import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .enum(['https://api.docuseal.com', 'https://api.docuseal.eu'])
      .default('https://api.docuseal.com')
      .describe('DocuSeal API base URL. Use US or EU cloud.')
  })
);
