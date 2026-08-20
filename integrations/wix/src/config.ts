import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    siteId: {
      schema: z
        .string()
        .optional()
        .describe('Wix Site ID for site-level API calls. Required for most API operations.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    accountId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Wix Account ID for account-level API calls. Use this instead of siteId for account-level operations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
