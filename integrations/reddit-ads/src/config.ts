import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountId: {
      schema: z
        .string()
        .describe('Reddit Ads account ID used for campaign management API calls'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
