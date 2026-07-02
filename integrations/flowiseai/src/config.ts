import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .describe('Base URL of your Flowise instance (e.g. https://your-flowise.com)')
  })
);
