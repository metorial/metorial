import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'eu', 'ca', 'au', 'in'])
      .default('us')
      .describe('The Svix API region. Determines the base URL for API requests.')
  })
);
