import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.aryn.cloud')
      .describe('Aryn API base URL. Use https://api.eu.aryn.cloud for the EU region.')
  })
);
