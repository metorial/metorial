import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    instanceUrl: z
      .string()
      .describe(
        'Braze REST API endpoint URL for your instance (e.g., https://rest.iad-01.braze.com). Found in your Braze dashboard under Settings.'
      )
  })
);
