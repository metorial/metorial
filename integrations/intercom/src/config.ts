import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'eu', 'au'])
      .default('us')
      .describe('Intercom workspace region. Determines the API endpoint used for requests.')
  })
);
