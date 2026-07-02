import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'canada', 'europe', 'australia'])
      .default('us')
      .describe('The region your Feathery account is hosted in. Determines the API base URL.')
  })
);
