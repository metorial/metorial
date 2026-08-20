import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    companyId: {
      schema: z
        .string()
        .optional()
        .describe('Your Whop company ID (e.g. biz_xxxxx). Required for most API operations.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
