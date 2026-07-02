import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'eu', 'au', 'in', 'cn', 'jp', 'sa', 'ca'])
      .default('us')
      .describe('Zoho data center region for API requests')
  })
);
