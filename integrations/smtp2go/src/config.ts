import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .enum([
        'https://api.smtp2go.com/v3',
        'https://us-api.smtp2go.com/v3',
        'https://eu-api.smtp2go.com/v3',
        'https://au-api.smtp2go.com/v3'
      ])
      .default('https://api.smtp2go.com/v3')
      .describe('API region endpoint')
  })
);
