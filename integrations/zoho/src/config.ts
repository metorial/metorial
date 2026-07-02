import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    datacenter: z
      .enum(['us', 'eu', 'in', 'au', 'jp', 'ca'])
      .default('us')
      .describe('Zoho data center region. Determines the API base URL and accounts URL.')
  })
);
