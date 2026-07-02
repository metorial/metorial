import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://app.documenso.com/api/v2')
      .describe('Base URL for the Documenso API. Override for self-hosted instances.')
  })
);
