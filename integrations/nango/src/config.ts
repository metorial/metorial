import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.nango.dev')
      .describe(
        'Base URL for the Nango API. Use https://api.nango.dev for Nango Cloud or http://localhost:3003 for local development.'
      )
  })
);
