import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    siteId: z
      .string()
      .optional()
      .describe('Wix Site ID for site-level API calls. Required for most API operations.'),
    accountId: z
      .string()
      .optional()
      .describe(
        'Wix Account ID for account-level API calls. Use this instead of siteId for account-level operations.'
      )
  })
);
