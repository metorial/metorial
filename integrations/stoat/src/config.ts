import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.revolt.chat')
      .describe('Base URL for the Revolt API. Change this if using a self-hosted instance.')
  })
);
