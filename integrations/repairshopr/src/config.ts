import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .describe(
          'Your RepairShopr account subdomain (e.g. "myshop" from myshop.repairshopr.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
