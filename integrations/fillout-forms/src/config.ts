import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.fillout.com')
      .describe(
        'Base URL for the Fillout API. Change this if using a self-hosted or EU instance (e.g. https://eu-api.fillout.com).'
      )
  })
);
