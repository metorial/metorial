import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.baserow.io')
      .describe(
        'Base URL of your Baserow instance. Defaults to https://api.baserow.io for Baserow Cloud. For self-hosted instances, use your own instance URL (e.g. https://baserow.example.com).'
      )
  })
);
