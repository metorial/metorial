import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .describe('Base URL of the Strapi instance (e.g., https://your-strapi-instance.com)')
  })
);
