import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://plausible.io')
      .describe(
        'Base URL for the Plausible Analytics instance. Defaults to the hosted service. Change this for self-hosted instances.'
      )
  })
);
