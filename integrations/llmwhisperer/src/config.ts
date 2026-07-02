import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us-central', 'eu-west'])
      .default('us-central')
      .describe('API region. Determines which regional endpoint to use.')
  })
);
