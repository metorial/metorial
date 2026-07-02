import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .describe(
        'Your RepairShopr account subdomain (e.g. "myshop" from myshop.repairshopr.com)'
      )
  })
);
