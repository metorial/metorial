import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.cal.com')
      .describe('Base URL for the Cal.com API. Change this if using a self-hosted instance.')
  })
);
