import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    dataCenter: z
      .enum(['us', 'eu', 'in', 'au', 'jp', 'ca', 'sa', 'cn'])
      .default('us')
      .describe('Zoho data center region')
  })
);
